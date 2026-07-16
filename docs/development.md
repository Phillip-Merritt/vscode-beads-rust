# Development

## Beads Setup (Issue Tracking)

After cloning, initialize beads:

```bash
br init
```

The extension uses `br` for project discovery and reads issue data from the `issues.jsonl` file under each project's `.beads/` directory. `br` keeps its state in an embedded SQLite database and flushes changes to JSONL via `br sync --flush-only`, which you can commit alongside your code.

## Build Commands

```bash
bun install              # Install dependencies
bun run compile          # Build extension + webview
bun run watch            # Watch mode (extension + webview in parallel)
bun run lint             # ESLint on src/**/*.{ts,tsx}
bun run test             # Jest tests
bun run package          # Create VSIX package
```

## Development Workflow

**Option 1: Extension Development Host (recommended for debugging)**
1. Open this repo in VS Code
2. Run `bun run watch` in terminal
3. Press `F5` to launch Extension Development Host
4. `Cmd+R` (Mac) / `Ctrl+R` (Win/Linux) to reload after changes

**Option 2: Symlink for local testing**
```bash
ln -s "$(pwd)" ~/.vscode/extensions/phillipmerritt.vscode-beads-rust
# Reload VS Code: Cmd+Shift+P → "Developer: Reload Window"
# Unlink when done
rm ~/.vscode/extensions/phillipmerritt.vscode-beads-rust
```

**Option 3: Install VSIX locally**
```bash
bun run package
code --install-extension vscode-beads-rust-*.vsix
```

## Releasing

Use the `/project-release` slash command in Claude Code:

1. Run `/project-release` from `main` branch
2. Confirm the computed version (minor bump by default)
3. Command audits changelog for missing user-facing changes
4. If complete, it updates CHANGELOG.md, bumps package.json, commits, tags, and pushes
5. Tag push triggers GitHub Actions to publish to VS Code Marketplace

For hotfixes, create a `release-v*` branch and run `/project-release` (patch bump).

## Architecture

See [CLAUDE.md](../CLAUDE.md) for architecture details, data flow, and code conventions.
