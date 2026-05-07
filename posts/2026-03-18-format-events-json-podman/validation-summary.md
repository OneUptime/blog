# Validation Summary: How to Format Events as JSON with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman events
- JSON Lines / NDJSON
- jq
- Bash scripting
- Python JSON processing

## Sources Consulted
- Podman events manual: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman events package documentation: https://pkg.go.dev/github.com/containers/podman/v6/libpod/events
- jq manual: https://jqlang.org/manual/
- Python json module documentation: https://docs.python.org/3/library/json.html

## Issues Found
- The sample JSON event structure used a Docker-style nested `Actor.Attributes` object. Podman event JSON uses top-level fields such as `ID`, `Image`, `Name`, `Status`, `Time`, `Type`, and optional top-level details such as `Attributes`. Updated the example JSON to use Podman's documented field shape.
- The jq example for extracting nested attributes used `.Actor.Attributes.name`, which does not match Podman's event structure. Updated it to `.Attributes.name`.

## Review Notes
Podman was not installed in the local workspace, so command behavior was verified against the current official Podman documentation and the published Podman event struct documentation. The post's `--format json`, `--since`, `--filter type=container`, Go template examples, JSON Lines/NDJSON explanation, jq usage, Bash snippets, and Python JSON parsing example are otherwise consistent with the consulted documentation.
