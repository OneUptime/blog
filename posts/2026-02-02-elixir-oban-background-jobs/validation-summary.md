# Validation Summary: How to Handle Background Jobs with Oban

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Elixir
- Oban (~> 2.17)
- PostgreSQL (Oban storage backend)
- Ecto / Ecto.Migration
- Phoenix application supervision patterns
- :telemetry (Erlang telemetry library)
- Oban.Testing (with implicit Mox usage in test example)
- Cron expressions

## Sources Consulted
- Oban hexdocs: https://hexdocs.pm/oban/2.17.12/Oban.html
- Oban.Migration docs: https://hexdocs.pm/oban/Oban.Migration.html
- Oban.Worker docs: https://hexdocs.pm/oban/Oban.Worker.html
- Oban.Plugins.Lifeline docs: https://hexdocs.pm/oban/Oban.Plugins.Lifeline.html
- Oban.Plugins.Pruner docs: https://hexdocs.pm/oban/Oban.Plugins.Pruner.html
- Oban.Plugins.Stager docs (and v2.14 deprecation notes): https://hexdocs.pm/oban/Oban.Plugins.Stager.html
- Oban.Plugins.Cron docs: https://hexdocs.pm/oban/Oban.Plugins.Cron.html
- Oban.Testing docs: https://hexdocs.pm/oban/Oban.Testing.html
- Oban telemetry docs: https://hexdocs.pm/oban/Oban.Telemetry.html
- Oban CHANGELOG (priority range 0..9 extended in 2.17; Stager moved out of plugins in 2.14)

## Issues Found

1. **Misleading Lifeline comment** — The production config block had a header comment "Rescue stuck jobs after 60 seconds (in case of node crashes)" above a `Lifeline` plugin configured with `rescue_after: :timer.minutes(60)`. `:timer.minutes(60)` is 60 minutes (3,600,000 ms), not 60 seconds, and `rescue_after` is the max job execution age before rescue (not a polling interval). Updated the comment to accurately reflect "Rescue jobs executing for > 60 minutes".

2. **Deprecated Stager plugin form** — The post used `{Oban.Plugins.Stager, interval: 1000}` inside the `plugins:` list. The `Oban.Plugins.Stager` was deprecated as a plugin in Oban v2.14 — staging was moved into Oban's core supervision tree and is now configured at the top level via the `stage_interval` option. Replaced with `stage_interval: 1000` at the top level of the config. (The old plugin form technically still compiles for backwards compatibility but emits a deprecation warning and is not the recommended form for 2.17+.)

## Review Notes

- Migration version `12` matches Oban 2.17's latest schema version, and the `Oban.Migration.up(version: 12)` / `Oban.Migration.down(version: 1)` pattern matches the documented usage.
- Priority range `0-9` is accurate for Oban 2.17 (extended from 0-3 in earlier versions — the v12 migration relaxes the priority CHECK constraint for this).
- All `perform/1` return values shown (`:ok`, `{:snooze, seconds}`, `{:error, reason}`, `{:cancel, reason}`) are valid in Oban 2.17.
- Telemetry metadata fields (`metadata.job`, `metadata.reason`, `metadata.stacktrace`) are correct for `[:oban, :job, :exception]`.
- `Oban.pause_queue/1`, `Oban.resume_queue/1`, `Oban.scale_queue/1`, `Oban.check_queue/1` all exist with the keyword-list shape demonstrated.
- `testing: :inline` is a valid testing mode (others: `:manual`, `:disabled`).
- The `Pruner` `max_age` is in seconds, so `60 * 60 * 24 * 7` correctly represents 7 days.
- The `~U[2024-12-25 09:00:00Z]` example uses a past date relative to today (2026-06-09); not technically wrong, but readers may want to use a current/future date when running the example.
- The `MyApp.MailerMock` test snippet implicitly assumes Mox is configured (Mailer behaviour, Mox `set_mox_global` or similar). Tutorial-level simplification — not incorrect, just incomplete context.
- In `Oban.Plugins.Stager`, the future direction is fully internal staging. Readers upgrading past 2.17 should remove any explicit Stager plugin reference entirely.
- The `Oban.Job` Ecto query in the "Monitor Queue Depth" section requires `import Ecto.Query` to use the macros (`where`, `group_by`, `select`). The post omits this import but that's typical for tutorial brevity.
