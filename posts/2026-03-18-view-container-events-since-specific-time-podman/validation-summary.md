# Validation Summary: How to View Container Events Since a Specific Time in Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman CLI
- Bash
- `jq`
- Shell date formatting

## Sources Consulted
- Podman official docs: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman v5.8.2 man-page source: https://github.com/containers/podman/blob/v5.8.2/docs/source/markdown/podman-events.1.md
- Podman v5.8.2 CLI source for `podman events`: https://github.com/containers/podman/blob/v5.8.2/cmd/podman/system/events.go
- Podman v5.8.2 source for event filtering and supported `--since` parsing: https://github.com/containers/podman/blob/v5.8.2/libpod/events/filters.go
- Podman v5.8.2 source for accepted timestamp layouts: https://github.com/containers/podman/blob/v5.8.2/pkg/util/utils.go

## Issues Found
- Historical query examples used `podman events --since ...` without disabling streaming. Podman streams by default, so the one-shot examples and shell scripts would continue waiting for new events instead of exiting after replaying historical results. I added `--stream=false` to the non-streaming examples and scripts.
- The JSON-processing example used `.Time`, but current Podman CLI JSON output uses the lowercase `time` key. I changed the `jq` example to read `.time`.
- The per-container counting example used Docker-style `.Actor.Attributes.name`, which is not the JSON shape emitted by Podman events. I changed it to use Podman’s top-level `.Name` field and added `--filter type=container` so the command matches the section description.
- The demonstration timestamp example printed a timezone-less value. I changed it to include an offset so readers can reuse the timestamp more reliably in time-based investigation examples.

## Review Notes
- Podman’s published `podman events` man page and the current stable CLI source are slightly out of sync for JSON output: the docs still show a string `Time` field in the example, while the stable CLI source emits `time` and `timeNano`.
- The stable docs describe `--since`/`--until` as accepting RFC3339Nano timestamps and Go durations, but Podman’s time parsing source also accepts RFC3339, `2006-01-02T15:04:05`, `2006-01-02`, and Unix timestamps.
