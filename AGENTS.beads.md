# Agent Instructions

This project uses **br** (beads_rust) for issue tracking. Run `br init` to get started.

## Quick Reference

```bash
br ready                # Find available work
br show <id>            # View issue details
br update <id> --claim  # Claim work atomically
br close <id>           # Complete work
br sync --flush-only    # Flush JSONL snapshot (then `git add .beads/issues.jsonl && git push`)
```

## Non-Interactive Shell Commands

**ALWAYS use non-interactive flags** with file operations to avoid hanging on confirmation prompts.

Shell commands like `cp`, `mv`, and `rm` may be aliased to include `-i` (interactive) mode on some systems, causing the agent to hang indefinitely waiting for y/n input.

**Use these forms instead:**
```bash
# Force overwrite without prompting
cp -f source dest           # NOT: cp source dest
mv -f source dest           # NOT: mv source dest
rm -f file                  # NOT: rm file

# For recursive operations
rm -rf directory            # NOT: rm -r directory
cp -rf source dest          # NOT: cp -r source dest
```

**Other commands that may prompt:**
- `scp` - use `-o BatchMode=yes` for non-interactive
- `ssh` - use `-o BatchMode=yes` to fail instead of prompting
- `apt-get` - use `-y` flag
- `brew` - use `HOMEBREW_NO_AUTO_UPDATE=1` env var

<!-- BEGIN BEADS INTEGRATION profile:full hash:d4f96305 -->
## Issue Tracking with br (beads_rust)

**IMPORTANT**: This project uses **br (beads_rust)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why br?

- **Local-first**: SQLite store plus a JSONL export; no external server, account, or API key
- **Git-friendly sync**: issue state ships in `.beads/issues.jsonl` on your normal branch — no separate metadata branch
- **Dependency-aware**: blockers, parent-child, and discovered-from relationships are first-class
- **Agent-optimized**: stable `--json` / `--robot` output, ready work detection, coordination status, ready-made `br agents --add` bootstrap
- **Non-invasive**: works fully offline; zero setup beyond `br init`

The "Why br?" comparison blurb in [`beads_rust/README.md`](https://github.com/beads-rs/beads-rs/blob/main/README.md) summarizes the trade-offs against GitHub Issues, Jira, and TODO comments; br wins on offline, in-repo, dependency-tracking, cost, machine-readability, and AI-agent integration axes.

### Quick Start

**Check for ready work:**

```bash
br ready --json
```

**Create new issues:**

```bash
br create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
br create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:br-123 --json
```

**Claim and update:**

```bash
br update <id> --claim --json
br update br-42 --priority 1 --json
```

**Complete work:**

```bash
br close br-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)
- `docs` - Documentation only
- `question` - Open question needing an answer

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `br ready --json` shows unblocked issues
2. **Claim your task atomically**: `br update <id> --claim --json`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `br create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `br close <id> --reason "Done" --json`

### Auto-Sync

br exports issues as JSONL (`.beads/issues.jsonl`) rather than running a separate metadata server:

- Every mutating command auto-flushes the JSONL snapshot by default
- Run `br sync --flush-only` as an idempotent final check before committing
- Commit the JSONL alongside your changes: `git add .beads/issues.jsonl && git commit`
- No separate server push/pull step — JSONL sync is git-native
- See [`beads_rust/docs/VCS_INTEGRATION.md`](https://github.com/beads-rs/beads-rs/blob/main/docs/VCS_INTEGRATION.md) for the canonical JSONL contract

### Important Rules

- ✅ Use br for ALL task tracking
- ✅ Always use `--json` (or `--robot`) flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `br ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md, docs/QUICKSTART.md, and [`beads_rust/docs/CLI_REFERENCE.md`](https://github.com/beads-rs/beads-rs/blob/main/docs/CLI_REFERENCE.md).

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   br sync --flush-only
   git add .beads/issues.jsonl
   git commit -m "sync beads JSONL" || true
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- END BEADS INTEGRATION -->
