# Upstream Beads Sync Check

Check the upstream [`br` / beads_rust](https://github.com/beads-rs/beads-rs) repo for changes that affect vscode-beads-rust.

The local reference checkout is `../beads_rust` (per `docs/upstream-sync/README.md`).

For the canonical reference on commands, flags, and types added upstream, see [`beads_rust/docs/CLI_REFERENCE.md`](https://github.com/beads-rs/beads-rs/blob/main/docs/CLI_REFERENCE.md).

## Output

Write your report to: `docs/upstream-sync/{{YYYY-MM-DD}}-upstream-sync-report.md` (use today's date).

---

## Process

### Step 1: Fetch Latest Upstream

```bash
cd ../beads_rust
git fetch origin
git stash  # if needed
git pull origin main
```

Note the current version tag:
```bash
git describe --tags --abbrev=0
```

### Step 2: Determine Last Sync Point

Read the last sync point from `docs/upstream-sync/README.md` (the "Current Sync Point" section).

After completing the sync report, update README.md with:
- New sync point version
- Entry in Sync History table
- Link to new report in Reports section
- Updated Pending Updates checklist

### Step 3: Analyze Relevant Files

For each area below, check for changes since the last sync point.

When new commands, flags, statuses, or issue types appear, cross-check them against [`beads_rust/docs/CLI_REFERENCE.md`](https://github.com/beads-rs/beads-rs/blob/main/docs/CLI_REFERENCE.md) before recording them in the report — that doc is the canonical source of truth for the user-facing surface that the extension talks to.

#### Types & Schema (`src/model/mod.rs`)

Check for new or changed:
- **Status values**: `Status::Open`, `Status::InProgress`, `Status::Blocked`, `Status::Deferred`, `Status::Closed`, custom statuses, etc.
- **IssueType values**: `IssueType::Bug`, `IssueType::Feature`, `IssueType::Task`, `IssueType::Epic`, `IssueType::Chore`, `IssueType::Docs`, `IssueType::Question`, etc.
- **New fields** on the Issue struct that should be displayed (priority, assignee, due date, defer date, estimate, external ref, labels, parent, etc.)

```bash
git diff <last-sync>..HEAD -- src/model/mod.rs
```

**What to update in vscode-beads-rust:**
- `src/webview/types.ts`: BeadStatus, BeadType, colors, labels, sort order
- `src/webview/icons/`: Add icons for new types
- `src/webview/common/TypeIcon.tsx`: Icon mappings

#### CLI Commands (`src/cli/commands/`)

Check for new commands or changed flags. The full command list lives under `src/cli/commands/<name>.rs` (e.g. `create.rs`, `update.rs`, `close.rs`, `ready.rs`, `sync.rs`).

```bash
git diff <last-sync>..HEAD -- src/cli/commands/
```

**What to update in vscode-beads-rust:**
- `src/backend/BeadsBackend.ts`: Surface new commands / flags for the webview
- `src/backend/BeadsCommandRunner.ts`: Add subprocess invocations and parsing for new flags
- `src/backend/types.ts`: Type definitions for new CLI response shapes

#### Dependency Model (`src/model/mod.rs` + `src/storage/sqlite.rs`)

Check for changes to dependency handling. Dependency types are declared in `src/model/mod.rs` and the storage-layer edge logic lives in `src/storage/sqlite.rs`.

```bash
git diff <last-sync>..HEAD -- src/model/mod.rs src/storage/sqlite.rs
```

**What to update in vscode-beads-rust:**
- `docs/reference/beads-dependency-model.md`: Update if the exposed dependency type vocabulary changes

#### Storage & JSONL Sync (`src/storage/`, `src/sync/`)

Check for changes to the SQLite schema (`src/storage/schema.rs`), the JSONL export contract (`src/sync/mod.rs`, `src/sync/path.rs`, `src/sync/history.rs`), or the write-combining queue (`src/write_combining.rs`).

```bash
git diff <last-sync>..HEAD -- src/storage/ src/sync/ src/write_combining.rs
```

**What to update in vscode-beads-rust:**
- `src/backend/BeadsCommandRunner.ts`: Adjust change-token detection if `issues.jsonl` mtime semantics change
- `docs/reference/beads-protected-branch.md`: Update JSONL commit workflow if the contract changes
- `docs/reference/beads-caveats.md`: Capture any new edge cases / gotchas

#### Coordination & Stale Work (`src/coordination.rs`, `src/cli/commands/coordination.rs`, `src/cli/commands/stale.rs`)

Check for changes to the in-progress claim model, stale-claim detection, or coordination status output.

```bash
git diff <last-sync>..HEAD -- src/coordination.rs src/cli/commands/coordination.rs src/cli/commands/stale.rs
```

**What to update in vscode-beads-rust:**
- `src/backend/BeadsBackend.ts`: Coordination status parsing
- `src/webview/`: New claim / abandoned-work UI affordances

### Step 4: Write Report

The report should include:
- Summary of what changed
- Detailed analysis by area (only areas with relevant changes)
- **For each changed upstream file, include a markdown link** like `[model/mod.rs](../beads_rust/src/model/mod.rs)` for easy navigation
- **For new concepts** (types, statuses, fields, commands), explain what they're for and the use-case — check commit messages, code comments, and `beads_rust/docs/CLI_REFERENCE.md` for context
- Proposed plan with priorities (P1: breaking, P2: new types, P3: enhancements, P4: docs)
- Outstanding questions needing answers
- Sync checklist
- Recommended next steps
- Record the sync point (tag or commit hash)

Be thorough but concise. Focus on changes that actually impact vscode-beads-rust.

---

## Reference Docs We Maintain

| Doc | Tracks |
|-----|--------|
| `docs/upstream-sync/` | Sync point, history, reports |
| `docs/reference/beads-dependency-model.md` | Dependency types, blocking semantics |
| `docs/reference/beads-protected-branch.md` | JSONL commit workflow, worktree caveats |
| `docs/reference/beads-caveats.md` | Known limitations, edge cases |

When a new command, flag, or issue type lands upstream, add or update the relevant row in `docs/reference/beads-dependency-model.md` (or another doc above) and link to the upstream `beads_rust/docs/CLI_REFERENCE.md` section that defines it.
