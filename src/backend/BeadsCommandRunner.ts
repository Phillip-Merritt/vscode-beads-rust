import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as util from "util";
import { Logger } from "../utils/logger";
import {
  AddCommentArgs,
  BackendCompatibility,
  BeadsBackend,
  BeadsIssue,
  CloseIssueArgs,
  CreateIssueArgs,
  DependencyArgs,
  UpdateIssueArgs,
} from "./BeadsBackend";

const execFileAsync = util.promisify(execFile);
const BD_COMMAND_TIMEOUT_MS = 30000;

function compareSemver(a: string, b: string): number {
  const aParts = a.split(".").map((n) => parseInt(n, 10));
  const bParts = b.split(".").map((n) => parseInt(n, 10));
  for (let i = 0; i < 3; i++) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

function detectSemver(text: string): string | undefined {
  const match = text.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return undefined;
  return `${match[1]}.${match[2]}.${match[3]}`;
}

function toStringArray(values?: string[]): string[] {
  if (!values || values.length === 0) return [];
  return values.flatMap((v) => ["--label", v]);
}

export class BeadsCommandRunner implements BeadsBackend {
  private readonly cliPath: string;
  private readonly cwd: string;
  private readonly beadsDir: string;
  private readonly log: Logger;
  private readonly minSupportedVersion: string;
  private readonly listLimit: number;
  private compatibilityPromise: Promise<BackendCompatibility> | null = null;
  private readonly inFlightReads = new Map<string, Promise<unknown>>();
  private readonly recentJsonCache = new Map<string, { expiresAt: number; value: unknown }>();

  constructor(params: {
    cliPath: string;
    cwd: string;
    beadsDir: string;
    log: Logger;
    minSupportedVersion?: string;
    listLimit?: number;
  }) {
    this.cliPath = params.cliPath;
    this.cwd = params.cwd;
    this.beadsDir = params.beadsDir;
    this.log = params.log.child("CLIBackend");
    this.minSupportedVersion = params.minSupportedVersion ?? "0.2.10";
    // Guard against 0/negative/NaN config values falling through to br.
    this.listLimit = params.listLimit && params.listLimit > 0 ? Math.floor(params.listLimit) : 500;
  }

  async dispose(): Promise<void> {
    this.inFlightReads.clear();
    this.recentJsonCache.clear();
  }

  async checkCompatibility(): Promise<BackendCompatibility> {
    this.compatibilityPromise ??= this.computeCompatibility();
    return this.compatibilityPromise;
  }

  async probeLive(): Promise<void> {
    await this.checkCompatibility();
  }

  async list(): Promise<BeadsIssue[]> {
    const result = await this.runReadJson(["list", "--json", "--limit", String(this.listLimit)], { cacheTtlMs: 750 });
    if (Array.isArray(result)) return result as BeadsIssue[];
    if (result && typeof result === "object" && Array.isArray((result as { issues?: unknown }).issues)) {
      return (result as { issues: BeadsIssue[] }).issues;
    }
    return [];
  }

  async info(): Promise<Record<string, unknown>> {
    const result = await this.runInfo();
    if (result && typeof result === "object" && !Array.isArray(result)) {
      return result as Record<string, unknown>;
    }
    return {};
  }

  async getChangeToken(): Promise<string | null> {
    const jsonlPath = path.join(this.beadsDir, "issues.jsonl");
    return new Promise((resolve) => {
      fs.stat(jsonlPath, (err, stats) => {
        if (err || !stats) {
          resolve(null);
          return;
        }
        resolve(String(stats.mtimeMs));
      });
    });
  }

  async show(id: string): Promise<BeadsIssue | null> {
    const result = await this.runReadJson(["show", id, "--json"], { cacheTtlMs: 250 });
    if (Array.isArray(result)) {
      return (result[0] as BeadsIssue | undefined) ?? null;
    }
    return (result as BeadsIssue) ?? null;
  }

  async create(args: CreateIssueArgs): Promise<BeadsIssue> {
    const cmdArgs = [
      "create",
      "--title",
      args.title,
      "--type",
      args.issue_type ?? "task",
      "--priority",
      String(args.priority ?? 2),
      ...toStringArray(args.labels),
      "--json",
    ];

    if (args.description) cmdArgs.push("--description", args.description);
    if (args.design) cmdArgs.push("--design", args.design);
    if (args.acceptance_criteria) cmdArgs.push("--acceptance", args.acceptance_criteria);
    if (args.assignee) cmdArgs.push("--assignee", args.assignee);

    const result = await this.runJson(cmdArgs);
    return this.pickSingleIssue(result, "create");
  }

  async update(args: UpdateIssueArgs): Promise<BeadsIssue> {
    const cmdArgs = ["update", args.id, "--json"];

    if (args.title !== undefined) cmdArgs.push("--title", args.title);
    if (args.description !== undefined) cmdArgs.push("--description", args.description);
    if (args.design !== undefined) cmdArgs.push("--design", args.design);
    if (args.acceptance_criteria !== undefined) {
      cmdArgs.push("--acceptance", args.acceptance_criteria);
    }
    if (args.notes !== undefined) cmdArgs.push("--notes", args.notes);
    if (args.status !== undefined) cmdArgs.push("--status", args.status);
    if (args.priority !== undefined) cmdArgs.push("--priority", String(args.priority));
    if (args.assignee !== undefined) cmdArgs.push("--assignee", args.assignee);
    if (args.external_ref !== undefined) cmdArgs.push("--external-ref", args.external_ref);
    if (
      args.estimated_minutes !== undefined &&
      args.estimate !== undefined &&
      args.estimated_minutes !== args.estimate
    ) {
      throw new Error("Conflicting estimate values: estimated_minutes and estimate differ");
    }
    const estimate = args.estimated_minutes ?? args.estimate;
    if (estimate !== undefined) cmdArgs.push("--estimate", String(estimate));
    if (
      args.type !== undefined &&
      args.issue_type !== undefined &&
      args.type !== args.issue_type
    ) {
      throw new Error("Conflicting issue type values");
    }
    const issueType = args.issue_type ?? args.type;
    if (issueType !== undefined) cmdArgs.push("--type", issueType);

    for (const label of args.add_labels ?? []) cmdArgs.push("--add-label", label);
    for (const label of args.remove_labels ?? []) cmdArgs.push("--remove-label", label);
    for (const label of args.set_labels ?? []) cmdArgs.push("--set-labels", label);

    const result = await this.runJson(cmdArgs);
    return this.pickSingleIssue(result, "update");
  }

  async close(args: CloseIssueArgs): Promise<BeadsIssue> {
    const cmdArgs = ["close", args.id, "--json"];
    if (args.reason) cmdArgs.push("--reason", args.reason);
    const result = await this.runJson(cmdArgs);
    return this.pickSingleIssue(result, "close");
  }

  async addDependency(args: DependencyArgs): Promise<void> {
    const depType = args.dep_type ?? "blocks";
    await this.runJson(["dep", "add", args.from_id, args.to_id, "--type", depType, "--json"]);
  }

  async removeDependency(args: DependencyArgs): Promise<void> {
    const cmdArgs = ["dep", "remove", args.from_id, args.to_id, "--json"];
    if (args.dep_type) cmdArgs.push("--type", args.dep_type);
    await this.runJson(cmdArgs);
  }

  async listComments(id: string): Promise<Array<{ id: string; author: string; text: string; created_at: string }>> {
    const result = await this.runReadJson(["comments", id, "--json"], { cacheTtlMs: 250 });
    return Array.isArray(result)
      ? (result as Array<{ id: string; author: string; text: string; created_at: string }>)
      : [];
  }

  async addComment(args: AddCommentArgs): Promise<void> {
    const cmdArgs = ["comments", "add", args.id, args.text, "--json"];
    if (args.actor) cmdArgs.push("--actor", args.actor);
    await this.runJson(cmdArgs);
  }

  private async execCli(args: string[], maxBuffer: number): Promise<{ stdout: string; stderr: string }> {
    const commandLabel = [this.cliPath, ...args].join(" ");
    this.log.debug(`Running: ${commandLabel} (cwd=${this.cwd}, BEADS_DIR=${this.beadsDir})`);

    const startedAt = Date.now();
    const result = await execFileAsync(this.cliPath, args, {
      cwd: this.cwd,
      env: {
        ...process.env,
        BEADS_DIR: this.beadsDir,
      },
      maxBuffer,
      timeout: BD_COMMAND_TIMEOUT_MS,
      killSignal: "SIGTERM",
    });

    const elapsedMs = Date.now() - startedAt;
    const stdout = result.stdout?.trim() ?? "";
    const stderr = result.stderr?.trim() ?? "";
    this.log.debug(`Completed: ${commandLabel} (${elapsedMs}ms)`);
    if (stdout) this.log.trace(`stdout: ${stdout}`);
    if (stderr) this.log.trace(`stderr: ${stderr}`);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  private async runJson(args: string[]): Promise<unknown> {
    const compatibility = await this.checkCompatibility();
    if (!compatibility.supported) {
      throw new Error(compatibility.message);
    }

    try {
      const { stdout } = await this.execCli(args, 10 * 1024 * 1024);
      const trimmed = stdout.trim();
      if (!trimmed) return [];
      return JSON.parse(trimmed);
    } catch (error) {
      const err = error as Error & { stderr?: string; stdout?: string };
      const stderr = err.stderr?.trim() ?? "";
      const stdout = err.stdout?.trim() ?? "";
      const rawMessage = stderr || stdout || err.message;
      this.log.trace(`br command failed: ${args.join(" ")} :: ${rawMessage}`);

      if (this.isProjectNotInitializedError(rawMessage)) {
        throw new Error("Beads project is not initialized. Run `br init` in this project. See Output > Beads for details.");
      }

      throw new Error(rawMessage);
    }
  }

  private async runReadJson(args: string[], options?: { cacheTtlMs?: number }): Promise<unknown> {
    const cacheKey = args.join("\u0000");
    const now = Date.now();
    const cached = this.recentJsonCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      this.log.trace(`Using cached result for: ${args.join(" ")}`);
      return cached.value;
    }

    const existing = this.inFlightReads.get(cacheKey);
    if (existing) {
      this.log.trace(`Joining in-flight read: ${args.join(" ")}`);
      return existing;
    }

    const promise = this.runJson(args)
      .then((result) => {
        const ttlMs = options?.cacheTtlMs ?? 0;
        if (ttlMs > 0) {
          this.recentJsonCache.set(cacheKey, {
            expiresAt: Date.now() + ttlMs,
            value: result,
          });
        }
        return result;
      })
      .finally(() => {
        this.inFlightReads.delete(cacheKey);
      });

    this.inFlightReads.set(cacheKey, promise);
    return promise;
  }

  private async runText(args: string[]): Promise<string> {
    const compatibility = await this.checkCompatibility();
    if (!compatibility.supported) {
      throw new Error(compatibility.message);
    }

    try {
      const { stdout, stderr } = await this.execCli(args, 10 * 1024 * 1024);
      const output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n").trim();
      return output;
    } catch (error) {
      const err = error as Error & { stderr?: string; stdout?: string };
      if ((err as NodeJS.ErrnoException).code === "ETIMEDOUT") {
        throw new Error(`br command timed out after ${BD_COMMAND_TIMEOUT_MS}ms: ${args.join(" ")}`);
      }
      const stderr = err.stderr?.trim() ?? "";
      const stdout = err.stdout?.trim() ?? "";
      throw new Error(stderr || stdout || err.message);
    }
  }

  private async runInfo(): Promise<Record<string, unknown>> {
    return (await this.runJson(["info", "--json"])) as Record<string, unknown>;
  }

  private async computeCompatibility(): Promise<BackendCompatibility> {
    const version = await this.getBrVersion();
    if (!version) {
      return {
        supported: false,
        minimumVersion: this.minSupportedVersion,
        message: `Unable to detect br version at '${this.cliPath}'.`,
      };
    }

    this.log.debug(`Using br ${version} from ${this.cliPath}`);

    if (compareSemver(version, this.minSupportedVersion) < 0) {
      return {
        supported: false,
        detectedVersion: version,
        minimumVersion: this.minSupportedVersion,
        message: `Unsupported br version ${version}. Requires >= ${this.minSupportedVersion}.`,
      };
    }

    return {
      supported: true,
      detectedVersion: version,
      minimumVersion: this.minSupportedVersion,
      message: `br ${version} is compatible`,
    };
  }

  private async getBrVersion(): Promise<string | undefined> {
    // br version --json returns a flat object like {"version":"0.2.19","branch":"master","commit":"...","build":"release",...}.
    // The bare `br version` text fallback exists for older br builds or systems where --json is stripped.
    const attempts: string[][] = [["version", "--json"], ["version"], ["--version"]];
    for (const args of attempts) {
      try {
        const { stdout, stderr } = await this.execCli(args, 1024 * 1024);
        // Try JSON shape first.
        try {
          const parsed = JSON.parse(stdout);
          if (parsed && typeof parsed === "object" && typeof parsed.version === "string") {
            const detected = detectSemver(parsed.version);
            if (detected) return detected;
          }
        } catch {
          // not JSON; fall through to text detection
        }
        const detected = detectSemver(`${stdout}\n${stderr}`);
        if (detected) return detected;
      } catch {
        continue;
      }
    }
    return undefined;
  }

  private pickSingleIssue(result: unknown, operation: string): BeadsIssue {
    if (Array.isArray(result)) {
      const issue = result[0] as BeadsIssue | undefined;
      if (issue) return issue;
    }
    if (result && typeof result === "object" && "id" in (result as Record<string, unknown>)) {
      return result as BeadsIssue;
    }
    throw new Error(`Unexpected JSON result from br ${operation}`);
  }

  private isProjectNotInitializedError(message: string): boolean {
    const normalized = message.toLowerCase();
    const missingNamedDatabase = normalized.includes('database "') && normalized.includes('" not found');
    return (
      missingNamedDatabase ||
      normalized.includes("has not been initialized")
    );
  }
}
