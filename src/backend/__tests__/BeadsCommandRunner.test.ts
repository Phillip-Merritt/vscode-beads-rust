import * as childProcess from "child_process";
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
async function setupRunnerWithCompat(version = "0.55.0"): Promise<BeadsCommandRunner> {
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