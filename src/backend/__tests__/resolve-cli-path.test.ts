import { resolveCliPath } from "../resolve-cli-path";

describe("resolveCliPath", () => {
  const originalEnv = process.env.BEADS_CLI;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.BEADS_CLI;
    else process.env.BEADS_CLI = originalEnv;
  });

  it("returns BEADS_CLI env when set", () => {
    process.env.BEADS_CLI = "/custom/path/br";
    expect(resolveCliPath(undefined)).toBe("/custom/path/br");
  });

  it("returns configured path when env is unset", () => {
    delete process.env.BEADS_CLI;
    expect(resolveCliPath("/opt/br")).toBe("/opt/br");
  });

  it("returns configured path when env is empty string", () => {
    process.env.BEADS_CLI = "";
    expect(resolveCliPath("/opt/br")).toBe("/opt/br");
  });

  it("returns default when neither env nor config is set", () => {
    delete process.env.BEADS_CLI;
    expect(resolveCliPath(undefined)).toBe("br");
  });

  it("returns default when config is empty string", () => {
    delete process.env.BEADS_CLI;
    expect(resolveCliPath("")).toBe("br");
  });
});