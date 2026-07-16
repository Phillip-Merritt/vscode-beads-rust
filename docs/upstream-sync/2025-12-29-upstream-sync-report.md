# Historical Sync Report — 2025-12-29

> `[Historical — 2025-12-29 sync against steveyegge/beads; current sync target is beads-rs/beads-rs]`
>
> This report describes a sync against the *previous* upstream target. The current extension no longer tracks that repo; the `br` / beads_rust fork is now the upstream. The body below documents what was learned during that sync so future readers can understand the migration context.

**Date**: 2025-12-29
**Upstream version at sync time**: v0.40.0
**Impact on current extension**: None of the CLI commands, types, or storage details in this report apply to `br` (beads_rust). They are preserved here only as a historical record of the upstream-vs-fork work that preceded the v0.14.0 backend switch.

---

## High-Level Findings

At sync time the previous upstream added several pieces of metadata (a rename of an ephemeral-issue flag, an issue-creator field, a "hook" work-assignment status, two agent/role issue types, and an expanded set of dependency-type tags). A handful of new subcommands and flags also landed. None of these shape the current extension today because the current extension talks to `br` (beads_rust), which uses a different CLI surface, a different storage layout (JSONL + embedded SQLite instead of a separate SQL server), and a much smaller initial dependency-type vocabulary.

If you are investigating anything *behavioural* on the current extension:

- See `beads_rust/docs/CLI_REFERENCE.md` for the CLI surface that the extension actually invokes.
- See `beads_rust/docs/ARCHITECTURE.md` and `beads_rust/docs/VCS_INTEGRATION.md` for the storage and commit model.
- See `docs/reference/beads-caveats.md` for current operational gotchas.

## Why this report is kept

The original full report (with the exact file paths, struct field names, and command listings from the previous upstream) was retained on the `docs/v0.14.0-release-prep-spec` branch during the v0.14.0 spec work. It is intentionally not duplicated here so that future readers cannot accidentally take its guidance as advice for the current backend.
