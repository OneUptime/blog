# Validation Summary: How to View Container Events Until a Specific Time in Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman CLI
- Bash
- jq
- JSON Lines

## Sources Consulted
- Podman `events` man page: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman v5.8.2 `cmd/podman/system/events.go`: https://raw.githubusercontent.com/containers/podman/v5.8.2/cmd/podman/system/events.go
- Podman v5.8.2 `libpod/events/config.go`: https://raw.githubusercontent.com/containers/podman/v5.8.2/libpod/events/config.go
- Podman v5.8.2 `libpod/events/journal_linux.go`: https://raw.githubusercontent.com/containers/podman/v5.8.2/libpod/events/journal_linux.go
- Podman v5.8.2 `libpod/events/logfile.go`: https://raw.githubusercontent.com/containers/podman/v5.8.2/libpod/events/logfile.go
- `containers/common` v0.64.2 timestamp parser: https://raw.githubusercontent.com/containers/common/v0.64.2/pkg/timetype/timestamp.go

## Issues Found
- The date-only example `podman events --until "2026-03-18"` was labeled as "end of day", but Podman parses date-only values as midnight at the start of that date. I changed it to `2026-03-18T23:59:59` so the example matches the description.
- The streaming example `podman events --until 60s` was incorrect. Podman interprets duration values for `--until` as times in the past relative to now, so `60s` means "until 60 seconds ago", not "for the next 60 seconds". I changed it to a future absolute timestamp computed with `date`.
- The incident-analysis jq example used `.Actor.Attributes.name`, which matches Docker-style event JSON rather than Podman's event JSON. I changed it to `.Name`.
- The export section described `--format json` output as a generic JSON file, but Podman emits JSON Lines. I changed the wording and filename to `.jsonl`.
- The CSV export example used `.Time`, but the current Podman implementation exposes the timestamp field as lower-case `.time` in JSON output. I corrected the jq expression.
- The CSV export count included the header row. I changed the arithmetic to subtract one so the reported event count matches the exported event rows.

## Review Notes
- Runtime execution was not performed because `podman` is not installed in this workspace; validation was done against the official man page and the current stable implementation sources.
- `podman events --format json` produces JSON Lines, so downstream tooling should treat the export as one JSON object per line rather than a single JSON array.
