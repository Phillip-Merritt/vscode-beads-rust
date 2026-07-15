import * as childProcess from "child_process";
import * as fs from "fs";
import { BeadsCommandRunner } from "../BeadsCommandRunner";
import { Logger } from "../../utils/logger";

// Mock child_process.execFile with a promisify.custom that returns {stdout, stderr}
// so util.promisify(execFile) resolves to an object instead of an array.
jest.mock("child_process", () => {
  const fn = jest.fn();
  const PROMISE_CUSTOM = Symbol.for("nodejs.util.promisify.custom");
  Object.defineProperty(fn, PROMISE_CUSTOM, {
    value: (cmd: string, args: string[], opts: unknown) => {
      return new Promise((resolve, reject) => {
        fn(cmd, args, opts, (err: Error | null, stdout: string, stderr: string) => {
          if (err) reject(err);
          else resolve({ stdout, stderr });
        });
      });
    },
  });
  return { execFile: fn };
});

jest.mock("fs");

function makeLogger(): Logger {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
    child: jest.fn(function (this: unknown) {
      return this;
    }),
    errorNotify: jest.fn(),
    show: jest.fn(),
    outputChannel: {} as never,
  } as unknown as Logger;
}

function makeRunner(minSupportedVersion?: string): BeadsCommandRunner {
  return new BeadsCommandRunner({
    cliPath: "br",
    cwd: "/tmp/test",
    beadsDir: "/tmp/test/.beads",
    log: makeLogger(),
    minSupportedVersion,
  });
}

function mockExecFileOnce(stdout: string, stderr = ""): void {
  const execFile = childProcess.execFile as unknown as jest.Mock;
  execFile.mockImplementationOnce(
    (
      _cmd: string,
      _args: string[],
      _opts: unknown,
      callback: (err: Error | null, stdout: string, stderr: string) => void
    ) => {
      callback(null, stdout, stderr);
    }
  );
}

function mockExecFileError(message: string): void {
  const execFile = childProcess.execFile as unknown as jest.Mock;
  execFile.mockImplementationOnce(
    (
      _cmd: string,
      _args: string[],
      _opts: unknown,
      callback: (err: Error) => void
    ) => {
      callback(new Error(message));
    }
  );
}

/**
 * Build a runner and prime the version-compat check so that subsequent
 * runJson() calls don't try to fetch the version. We use a version well
 * above any plausible minSupportedVersion so compat passes regardless.
 */
async function setupRunnerWithCompat(version = "0.2.19"): Promise<BeadsCommandRunner> {
  const runner = makeRunner();
  mockExecFileOnce(JSON.stringify({ version, branch: "master", commit: "abc" }));
  await runner.checkCompatibility();
  return runner;
}

describe("BeadsCommandRunner.list", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("unwraps br envelope shape { issues: [...] }", async () => {
    const runner = await setupRunnerWithCompat();
    mockExecFileOnce(
      JSON.stringify({
        issues: [
          { id: "a", title: "A", status: "open", priority: 2, type: "task" },
          { id: "b", title: "B", status: "open", priority: 2, type: "task" },
        ],
        total: 2,
        limit: 500,
        offset: 0,
        has_more: false,
      })
    );

    const issues = await runner.list();
    expect(issues).toHaveLength(2);
    expect(issues.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("accepts legacy bare-array response", async () => {
    const runner = await setupRunnerWithCompat();
    mockExecFileOnce(
      JSON.stringify([{ id: "x", title: "X", status: "open", priority: 2, type: "task" }])
    );

    const issues = await runner.list();
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe("x");
  });

  it("passes --limit 500 on every list call", async () => {
    const runner = await setupRunnerWithCompat();
    mockExecFileOnce(
      JSON.stringify({ issues: [], total: 0, limit: 500, offset: 0, has_more: false })
    );

    await runner.list();

    const execFile = childProcess.execFile as unknown as jest.Mock;
    // Compat check (during setupRunnerWithCompat) + list = 2 total calls.
    expect(execFile).toHaveBeenCalledTimes(2);
    const [, listArgs] = execFile.mock.calls[1];
    expect(listArgs).toEqual(["list", "--json", "--limit", "500"]);
  });
});

describe("BeadsCommandRunner.addComment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes --actor (not --author) when actor is provided", async () => {
    const runner = await setupRunnerWithCompat();
    mockExecFileOnce(""); // br comments add returns empty stdout on success

    await runner.addComment({ id: "br-1", text: "hello", actor: "alice" });

    const execFile = childProcess.execFile as unknown as jest.Mock;
    expect(execFile).toHaveBeenCalledTimes(2);
    const [, args] = execFile.mock.calls[1];
    expect(args).toEqual(["comments", "add", "br-1", "hello", "--json", "--actor", "alice"]);
    expect(args).not.toContain("--author");
  });

  it("omits --actor entirely when actor is not provided", async () => {
    const runner = await setupRunnerWithCompat();
    mockExecFileOnce("");

    await runner.addComment({ id: "br-1", text: "hello" });

    const execFile = childProcess.execFile as unknown as jest.Mock;
    const [, args] = execFile.mock.calls[1];
    expect(args).toEqual(["comments", "add", "br-1", "hello", "--json"]);
    expect(args).not.toContain("--actor");
    expect(args).not.toContain("--author");
  });
});

describe("BeadsCommandRunner.getChangeToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns mtimeMs as a string", async () => {
    const stat = fs.stat as unknown as jest.Mock;
    stat.mockImplementationOnce(
      (
        _path: string,
        callback: (err: Error | null, stats: { mtimeMs: number }) => void
      ) => {
        callback(null, { mtimeMs: 1737038400000 });
      }
    );
    const runner = makeRunner();
    const token = await runner.getChangeToken();
    expect(token).toBe("1737038400000");
  });

  it("queries the issues.jsonl path under beadsDir", async () => {
    const stat = fs.stat as unknown as jest.Mock;
    stat.mockImplementationOnce(
      (
        _path: string,
        callback: (err: Error | null, stats: { mtimeMs: number }) => void
      ) => {
        callback(null, { mtimeMs: 1 });
      }
    );
    const runner = makeRunner();
    await runner.getChangeToken();
    expect(stat).toHaveBeenCalledWith(
      expect.stringMatching(/issues\.jsonl$/),
      expect.anything()
    );
  });

  it("returns null when the file does not exist", async () => {
    const stat = fs.stat as unknown as jest.Mock;
    stat.mockImplementationOnce(
      (
        _path: string,
        callback: (err: Error | null, stats?: { mtimeMs: number }) => void
      ) => {
        callback(new Error("ENOENT"));
      }
    );
    const runner = makeRunner();
    const token = await runner.getChangeToken();
    expect(token).toBeNull();
  });
});

describe("BeadsCommandRunner.checkCompatibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes for br version 0.2.19 (above min 0.2.10)", async () => {
    const runner = makeRunner();
    mockExecFileOnce(
      JSON.stringify({
        version: "0.2.19",
        build: "release",
        commit: "abc",
        branch: "master",
      })
    );

    const compat = await runner.checkCompatibility();
    expect(compat.supported).toBe(true);
    expect(compat.detectedVersion).toBe("0.2.19");
    expect(compat.minimumVersion).toBe("0.2.10");
  });

  it("rejects br version 0.2.5 (below min 0.2.10)", async () => {
    const runner = makeRunner();
    mockExecFileOnce(
      JSON.stringify({
        version: "0.2.5",
        build: "release",
        commit: "abc",
        branch: "master",
      })
    );

    const compat = await runner.checkCompatibility();
    expect(compat.supported).toBe(false);
    expect(compat.detectedVersion).toBe("0.2.5");
  });

  it("fails gracefully when br is not on PATH", async () => {
    // All three attempts in getBrVersion fail; no version detected.
    mockExecFileError("spawn br ENOENT");
    mockExecFileError("spawn br ENOENT");
    mockExecFileError("spawn br ENOENT");
    const runner = makeRunner();

    const compat = await runner.checkCompatibility();
    expect(compat.supported).toBe(false);
    expect(compat.message).toMatch(/br/); // error mentions the configured binary name
  });
});