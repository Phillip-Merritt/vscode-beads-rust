# Upstream Beads Sync

Tracks synchronization between vscode-beads-rust and upstream [`br` / beads_rust](https://github.com/beads-rs/beads-rs).

## Current Sync Point

Tracking against the [beads-rs/beads-rs](https://github.com/beads-rs/beads-rs) branch used at design time. Run `git -C ../beads_rust fetch && git -C ../beads_rust pull` before each sync review.

## Sync History

| Date | Target | Summary |
|------|--------|---------|
| 2026-07-16 | beads-rs/beads-rs | v0.14.0 — backend switch to `br` (beads_rust); new package identity, publisher, and repo URL |
| 2025-12-29 | legacy upstream (see [disclaimer](./2025-12-29-upstream-sync-report.md)) | `wisp`→`ephemeral`, `created_by`, `hooked` status, `agent`/`role` types, daemon API fields — see [historical report](./2025-12-29-upstream-sync-report.md) |

## Pending Updates (post v0.14.0)

None tracked at the moment. The previous "Pending Updates" list targeted the legacy backend and has been retired alongside it. (See the [historical report](./2025-12-29-upstream-sync-report.md) for the work that applied to the older CLI.)

## References

- [beads-rs/beads-rs CLI reference](https://github.com/beads-rs/beads-rs/blob/main/docs/CLI_REFERENCE.md)
- [beads-rs/beads-rs architecture](https://github.com/beads-rs/beads-rs/blob/main/docs/ARCHITECTURE.md)
- Local reference repo: `../beads_rust`
