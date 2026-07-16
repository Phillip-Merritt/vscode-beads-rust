# Beads Caveats & Known Issues

Notes on beads behavior, naming changes, and gotchas encountered during development.

> **Note:** This doc covers the current `br`-based extension. Earlier revisions of the extension used a different CLI and an embedded SQL server; that workflow has been retired and the caveats that applied to it have been removed.

## JSONL Filename

**Canonical filename is `issues.jsonl`**.

- `br` always reads and writes `.beads/issues.jsonl`.
- Old `beads.jsonl` references in custom scripts or older docs are legacy and should be updated.
- See `beads_rust/docs/CLI_REFERENCE.md` (`br sync`) for the canonical JSONL contract.

If you have an older setup with `beads.jsonl`, `br` does not auto-migrate; rename the file (or regenerate via `br init && br sync --import-only --rebuild`).

## `br doctor` Warnings After Fresh Init

`br doctor` may show warnings immediately after `br init` - this is a known UX issue. A fresh init shouldn't require doctor fixes. If `br doctor` is unhappy, run `br doctor --repair` to rebuild the embedded database from the authoritative JSONL.

## JSONL Sync After Edits

The extension and the CLI both mutate the embedded database; `br` flushes the database back to JSONL via `br sync --flush-only`. After running any `br` command, commit the updated `.beads/issues.jsonl` (and `deletions.jsonl` if present) alongside your code.

- If the extension cannot read issue data, run `br doctor` and `br sync --status` from the affected project to confirm the embedded DB and JSONL agree.
- Run `br sync --flush-only` before any commit that should include the latest issue state.
