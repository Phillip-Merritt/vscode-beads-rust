# Beads Protected Branch Workflow

> **Not applicable to the current backend.** This file is preserved as a historical reference only.
>
> `br` (beads_rust) does not implement a separate metadata-branch worktree / protected-branch workflow. Issue data lives in the same branch as your code and is committed via the usual git workflow after `br sync --flush-only`.
>
> For the current storage and sync model, see:
> - [`beads_rust/docs/CLI_REFERENCE.md`](https://github.com/beads-rs/beads-rs/blob/main/docs/CLI_REFERENCE.md) (`br init`, `br sync`)
> - [`beads_rust/docs/VCS_INTEGRATION.md`](https://github.com/beads-rs/beads-rs/blob/main/docs/VCS_INTEGRATION.md)
> - [`docs/reference/beads-caveats.md`](./beads-caveats.md)

This file used to document a separate-branch workflow that kept issue data off feature branches. That pattern required cooperation between an external init step and a sync command to manage a sidecar git worktree — features the current CLI no longer exposes. Issues are now kept on the active branch and exported to JSONL on demand via `br sync --flush-only`.

If you need to mirror an older workflow that isolated issue data, set up a manual orphan branch or sub-tree and move `.beads/` there yourself; the extension has no opinion on it.
