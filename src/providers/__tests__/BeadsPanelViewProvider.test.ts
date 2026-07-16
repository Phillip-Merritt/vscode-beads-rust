/**
 * Tests for BeadsPanelViewProvider.
 *
 * These cover three regressions around the "nothing showing up" bug:
 *   1. hardRefresh() must return a Promise that resolves AFTER loadData posts
 *      setBeads, so the caller (the beads.refresh command) can await real
 *      completion instead of "Refresh complete" firing before data is fetched.
 *   2. MIN_LOADING_MS must NOT gate manualRefresh/projectChange. The 500ms
 *      minimum was a first-paint flicker guard; it should not delay the
 *      setBeads post on every refresh.
 *   3. A loadData that bails because of a newer request must still post
 *      setLoading(false), so a stale background load does not leave the
 *      webview stuck on the loading state.
 */

import { BeadsPanelViewProvider } from "../BeadsPanelViewProvider";
import { Logger } from "../../utils/logger";

// The `vscode` module is provided by Jest's moduleNameMapper (see jest.config.js).

// --- Mocks ----------------------------------------------------------------

const mockPostMessage = jest.fn();
const mockWebviewView = {
  webview: {
    postMessage: mockPostMessage,
    options: {},
    html: "",
    onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
  },
  show: jest.fn(),
  visible: true,
  onDidChangeVisibility: jest.fn(() => ({ dispose: jest.fn() })),
};

const mockExtensionUri = { fsPath: "/test" } as unknown as Parameters<
  typeof BeadsPanelViewProvider
>[0];
const mockProjectManager = {
  getClient: jest.fn(),
  getActiveProject: jest.fn(),
  getProjects: jest.fn(),
  notifyBackendError: jest.fn(),
};

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

function makeClient(listImpl: () => Promise<unknown[]>) {
  return { list: jest.fn().mockImplementation(listImpl) };
}

// --- Helpers --------------------------------------------------------------

type SetBeadsMsg = { type: "setBeads"; beads: unknown[] };
type SetLoadingMsg = { type: "setLoading"; loading: boolean };
type AnyMsg = SetBeadsMsg | SetLoadingMsg | { type: string; [k: string]: unknown };

function messagesOfType<T extends AnyMsg>(type: T["type"]): T[] {
  return mockPostMessage.mock.calls
    .map((call) => call[0] as AnyMsg)
    .filter((m) => m.type === type);
}

// --- Tests ----------------------------------------------------------------

describe("BeadsPanelViewProvider", () => {
  let provider: BeadsPanelViewProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new BeadsPanelViewProvider(
      mockExtensionUri,
      mockProjectManager as never,
      makeLogger()
    );
    (provider as unknown as { _view: typeof mockWebviewView })._view =
      mockWebviewView;
    mockProjectManager.getActiveProject.mockReturnValue(null);
    mockProjectManager.getProjects.mockReturnValue([]);
  });

  // --- Fix 1: hardRefresh must return a Promise ----------------------------

  describe("hardRefresh", () => {
    it("returns a Promise", () => {
      mockProjectManager.getClient.mockReturnValue(makeClient(async () => []));

      const result = provider.hardRefresh();
      expect(result).toBeInstanceOf(Promise);
      return result; // settle so the test doesn't leak
    });

    it("the returned Promise resolves AFTER setBeads is posted", async () => {
      let resolveList: (value: unknown[]) => void = () => {};
      const client = makeClient(
        () =>
          new Promise<unknown[]>((resolve) => {
            resolveList = resolve;
          })
      );
      mockProjectManager.getClient.mockReturnValue(client);

      let resolved = false;
      const refreshPromise = provider.hardRefresh().then(() => {
        resolved = true;
      });

      // Yield once so loadData runs up to the await client.list().
      // At this point setBeads:[] should have been posted as the loading
      // placeholder, but the populated setBeads (with actual data) should
      // not yet exist.
      await Promise.resolve();
      const setBeadsBeforeResolve = messagesOfType<SetBeadsMsg>("setBeads");
      expect(setBeadsBeforeResolve).toHaveLength(1);
      expect(setBeadsBeforeResolve[0].beads).toEqual([]);
      expect(resolved).toBe(false);

      // Resolve the list
      resolveList([]);

      await refreshPromise;
      expect(resolved).toBe(true);
      // Now a second setBeads (with the actual data) should have been posted.
      expect(messagesOfType<SetBeadsMsg>("setBeads").length).toBeGreaterThanOrEqual(2);
    });
  });

  // --- Fix 2: MIN_LOADING_MS only for `initial` ----------------------------

  describe("loadData minimum-loading timing", () => {
    it("post setBeads for manualRefresh in < 200ms (no 500ms gate)", async () => {
      const client = makeClient(async () => []);
      mockProjectManager.getClient.mockReturnValue(client);

      const start = Date.now();
      await (
        provider as unknown as {
          loadData: (r: string) => Promise<void>;
        }
      ).loadData("manualRefresh");
      const elapsed = Date.now() - start;

      // 12ms typical br list latency; cap well below 500ms to detect regressions
      expect(elapsed).toBeLessThan(200);
      expect(messagesOfType<SetBeadsMsg>("setBeads").length).toBeGreaterThan(0);
    });

    it("post setBeads for projectChange in < 200ms (no 500ms gate)", async () => {
      const client = makeClient(async () => []);
      mockProjectManager.getClient.mockReturnValue(client);

      const start = Date.now();
      await (
        provider as unknown as {
          loadData: (r: string) => Promise<void>;
        }
      ).loadData("projectChange");
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(200);
    });

    it("waits at least 500ms for `initial` (flicker guard intact)", async () => {
      const client = makeClient(async () => []);
      mockProjectManager.getClient.mockReturnValue(client);

      const start = Date.now();
      await (
        provider as unknown as {
          loadData: (r: string) => Promise<void>;
        }
      ).loadData("initial");
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(500);
    });
  });

  // --- Fix 3: stale loadData must clear the loading state -----------------

  describe("stale loadData handling", () => {
    it("a stale loadData posts setLoading(false) so the webview is not stuck", async () => {
      let resolveList: (value: unknown[]) => void = () => {};
      const listPromise = new Promise<unknown[]>((resolve) => {
        resolveList = resolve;
      });
      // All calls return the same in-flight promise (matches the real
      // BeadsCommandRunner.inFlightReads dedup behavior).
      const client = { list: jest.fn().mockReturnValue(listPromise) };
      mockProjectManager.getClient.mockReturnValue(client);

      const loadData = (
        provider as unknown as {
          loadData: (r: string) => Promise<void>;
        }
      ).loadData.bind(provider);

      // Fire THREE loadData calls back-to-back. Only the last is current;
      // the first two must bail. Without fix #3, only the winner's try +
      // finally (2 calls) would set loading(false); with fix #3, each bail
      // also posts setLoading(false), bringing the total to 4.
      const p1 = loadData("manualRefresh");
      const p2 = loadData("manualRefresh");
      const p3 = loadData("manualRefresh");
      resolveList([]);

      await Promise.all([p1, p2, p3]);

      const loadingOff = messagesOfType<SetLoadingMsg>("setLoading").filter(
        (m) => m.loading === false
      );
      // 2 bails + 2 from the winner = 4 with the fix. Without it, only 2.
      expect(loadingOff.length).toBeGreaterThanOrEqual(3);
    });
  });
});
