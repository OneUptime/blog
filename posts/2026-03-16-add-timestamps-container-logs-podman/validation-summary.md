# Validation Summary: How to Add Timestamps to Container Logs in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container logs
- Shell commands
- GNU date
- awk, grep, sed, sort

## Sources Consulted
- Podman official documentation: `podman logs` command reference, https://docs.podman.io/en/latest/markdown/podman-logs.1.html
- Podman official documentation: `podman logs` command reference for Podman 5.2.2, https://docs.podman.io/en/v5.2.2/markdown/podman-logs.1.html
- Go package documentation for Podman log timestamp formatting, https://pkg.go.dev/github.com/containers/podman/v3/libpod/logs
- RFC 3339 date and time format, https://www.rfc-editor.org/rfc/rfc3339

## Issues Found
- The post said Podman timestamps are appended, but the examples and timestamp behavior place timestamps at the beginning of log lines. Changed "appended" to "prepended."
- The multi-container sorting examples added `[web]`, `[api]`, and `[db]` labels before the timestamp, then sorted as if the timestamp were still the first field. Changed the examples to sort on the second field and updated the comment accordingly.
- The "specific second" grep example used `2026-03-16T14:30:0`, which matches multiple seconds from `14:30:00` through `14:30:09`. Changed it to a full second value, `2026-03-16T14:30:01`.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was validated against official Podman documentation rather than local `podman logs --help` output. The documented `--timestamps` / `-t`, `--tail`, `--follow` / `-f`, `--since`, and `--until` options are current. The post's use of GNU `date -d` is Linux-specific as stated.
