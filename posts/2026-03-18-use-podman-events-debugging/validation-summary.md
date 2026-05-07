# Validation Summary: How to Use podman events for Debugging

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- `podman events`
- `podman inspect`
- `podman logs`
- `podman stats`
- Podman networking
- Bash
- `jq`

## Sources Consulted
- Podman documentation: `podman-events` - https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman documentation: `podman-inspect` - https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman documentation: `podman-run` - https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman documentation: `podman-network-create` - https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman documentation: `podman-network-inspect` - https://docs.podman.io/en/latest/markdown/podman-network-inspect.1.html
- Podman documentation: `podman-logs` - https://docs.podman.io/en/latest/markdown/podman-logs.1.html
- Podman documentation: `podman-stats` - https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman v5.8.2 source: `cmd/podman/system/events.go` - https://github.com/containers/podman/blob/v5.8.2/cmd/podman/system/events.go
- Podman v5.8.2 source: `libpod/events/config.go` - https://github.com/containers/podman/blob/v5.8.2/libpod/events/config.go
- Podman v5.8.2 source: `libpod/events/filters.go` - https://github.com/containers/podman/blob/v5.8.2/libpod/events/filters.go

## Issues Found
- Historical event queries used `--since` without `--stream=false`. Because `podman events` streams by default, those commands and scripts would wait indefinitely after printing the existing events. I added `--stream=false` everywhere the post expects a finite historical query.
- The post mixed Docker-style and outdated event field names. Current released Podman uses the `died` status, and the JSON event output uses top-level fields such as `.Name`, `.Image`, `.Status`, `.ContainerExitCode`, and `time`. I corrected the scripts accordingly and converted `time` to ISO 8601 where the post builds readable timelines.
- The restart-loop and correlated-event scripts did not restrict results to container events, so pod, image, or other event types could be counted or displayed. I added `--filter type=container` where the post specifically analyzes container behavior.
- The original OOM example streamed bytes from `/dev/zero` to `/dev/null`, which does not reliably allocate enough container memory to trigger an OOM kill. I replaced it with a Python allocation example that actually consumes memory under a `--memory 10m` limit.
- The crash example used `exit 137`, which is a normal process exit with status 137, not a signal-based crash. I changed it to send `SIGKILL` to PID 1 after a delay and emit a log line first so the example better matches the section’s debugging goal.

## Review Notes
- The published `podman-events` man page and the released Podman 5.8.2 CLI source do not fully agree on some event JSON and timestamp details. Where they conflicted, the post was aligned to the released 5.8.2 command implementation so the examples reflect real CLI behavior.
- Podman was not installed in the review environment, so validation was performed against official documentation and the released Podman source rather than by executing the commands locally.
