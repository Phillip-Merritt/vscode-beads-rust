/**
 * Mock for the `vscode` module so the view provider tests can run outside
 * of the VS Code runtime. Only the APIs the view providers touch are stubbed.
 */

import { jest } from "@jest/globals";

export class Uri {
  constructor(public fsPath: string) {}
  static file(p: string): Uri {
    return new Uri(p);
  }
  static joinPath(...parts: Array<Uri | string>): Uri {
    return new Uri(
      parts
        .map((p) => (typeof p === "string" ? p : p.fsPath))
        .join("/")
    );
  }
}

export class EventEmitter<T> {
  private listeners: Array<(e: T) => void> = [];
  event = (listener: (e: T) => void) => {
    this.listeners.push(listener);
    return { dispose: () => {} };
  };
  fire(e: T): void {
    for (const l of this.listeners) l(e);
  }
  dispose(): void {
    this.listeners = [];
  }
}

export const window = {
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  createOutputChannel: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn(),
  })),
  createStatusBarItem: jest.fn(() => ({
    text: "",
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  })),
};

export const commands = {
  executeCommand: jest.fn(),
};

export const workspace = {
  getConfiguration: jest.fn(() => ({
    get: jest.fn(),
    update: jest.fn(),
  })),
  workspaceFolders: [],
  onDidChangeWorkspaceFolders: jest.fn(),
  fs: { stat: jest.fn() },
};

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export enum ThemeColor {
  // Stub
}

export class Position {
  constructor(public line: number, public character: number) {}
}

export class Range {
  constructor(
    public start: Position,
    public end: Position
  ) {}
}

export class Selection {
  constructor(
    public start: Position,
    public end: Position
  ) {}
}

export class CancellationTokenSource {
  token = { isCancellationRequested: false };
  cancel(): void {}
  dispose(): void {}
}

export type WebviewView = unknown;
export type WebviewViewResolveContext = unknown;
export type WebviewViewProvider = unknown;
