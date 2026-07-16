# Beads Rust — VS Code Extension

<img src="resources/icon.png" alt="Beads icon" width="128" align="right">

VS Code extension for managing [Beads](https://github.com/beads-rs/beads-rs) issues via the `br` (beads_rust) CLI.

This extension is a fork of [jdillon/vscode-beads](https://github.com/jdillon/vscode-beads) adapted to call the Rust port of the Beads CLI. It does **not** work against the upstream Go `bd` CLI; install `br` and call `br init` in your project.

![Beads Rust screenshot](docs/images/beads-vscode-screenshot.png)

## Features

- **Issues Panel** — Sortable, filterable table; kanban board toggle; column visibility, order, sort preferences persist across reloads; filter presets for Open / Blocked / Epics / Not Closed.
- **Details Panel** — View & edit title, description, status, priority, type, labels, assignee; markdown rendering in description and notes; timezone-aware timestamps; dependency management grouped by relationship type.
- **Multi-Project** — Auto-detects `.beads/` directories in the workspace; project switcher in the dashboard.
- **Direct CLI Reads** — Spawns `br` with `--json`; `issues.jsonl` mtime polling for near-real-time updates.
- **Refresh Hooks** — Manual refresh, on-startup refresh, project-change refresh; loading-spinner fix avoids premature "complete" reports.

## Requirements

- VS Code 1.85.0 or newer.
- `br` CLI on your `PATH` (or set `beads.cliPath` to an explicit path/binary name). Minimum `br` version: **0.2.10**.
- A project initialized with `br init` (creates the `.beads/` directory the extension reads from).

## Installation

- **VS Code Marketplace:** install via the Extensions panel → search "Beads Rust" or use the marketplace badge (link below).
- **Open VSX:** install via the Extensions panel in Cursor / VSCodium / Project IDX, or via the Open VSX badge (link below).
- **Manual VSIX:**
  ```bash
  bun run package                                  # builds vscode-beads-rust-X.Y.Z.vsix
  code --install-extension vscode-beads-rust-*.vsix
  ```

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/phillipmerritt.vscode-beads-rust?label=VS%20Code)](https://marketplace.visualstudio.com/items?itemName=phillipmerritt.vscode-beads-rust) [![Open VSX](https://img.shields.io/open-vsx/v/phillipmerritt/vscode-beads-rust?label=Open%20VSX)](https://open-vsx.org/extension/phillipmerritt/vscode-beads-rust)

## Usage

1. Initialize: `br init` (in your project root).
2. Open VS Code; click the Beads icon in the Activity Bar.
3. The extension detects `.beads/` directories; switch projects from the Dashboard.

### Commands

| Command | Description |
| --- | --- |
| `Beads: Switch Project` | Switch the active Beads project |
| `Beads: Open Issues Panel` | Open the Issues webview |
| `Beads: Open Issue Details` | Open the Details webview |
| `Beads: Refresh` | Refresh all views |
| `Beads: Copy Issue ID` | Copy the selected issue id |

### Settings

| Setting | Default | Description |
| --- | --- | --- |
| `beads.cliPath` | `"br"` | Path or name of the `br` CLI binary; supports `${env:VAR}` placeholders; override with `BEADS_CLI`. |
| `beads.refreshInterval` | `3000` | Polling interval in ms for change detection (0 disables polling). |
| `beads.renderMarkdown` | `true` | Render markdown in description, notes, and other text fields. |
| `beads.userId` | `""` | User ID for "Assign to me"; `${env:VAR}` placeholders; falls back to `$USER`. |
| `beads.tooltipHoverDelay` | `1000` | Delay in ms before showing hover tooltips (0 disables). |

## Troubleshooting

- **"No Beads projects found"** — Run `br init` in the project root, then reload the window.
- **`br` not found / spawn fails** — Install per `beads_rust` docs (`brew install beads-rs/tap/beads-rust` or `cargo install beads_rust`) and verify `br --version`. Set `beads.cliPath` to an explicit binary path if `br` is not on `PATH`.
- **Commands fail with a `br` error** — Open the "Beads" output channel to see stderr; many errors include an exit code and short error body.
- **Stale issue list** — Trigger `Beads: Refresh` from the command palette.

## Credits

- Forked from [jdillon/vscode-beads](https://github.com/jdillon/vscode-beads) (Apache-2.0). The original UI, status/priority normalization, multi-project discovery, and webview plumbing all originate from that project.
- Issue-type icons from [Font Awesome Free](https://fontawesome.com) (CC BY 4.0).
- Beads logo SVG adapted from the upstream extension artwork.

## License

[Apache License 2.0](LICENSE).