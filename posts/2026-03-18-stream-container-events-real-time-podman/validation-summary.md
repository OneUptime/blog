# Validation Summary: How to Stream Container Events in Real-Time with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman CLI events streaming
- Bash
- jq
- JSON Lines

## Sources Consulted
- Podman events official documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman inspect official documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- jq official manual: https://jqlang.github.io/jq/manual/

## Issues Found
- The JSON parsing script used Docker-style fields (`.Actor.Attributes.name` and `.time`) that are not documented for `podman events --format json`. Changed them to Podman's documented `.Name` and `.Time` fields.
- The script handled a `die` status, but Podman documents the container event status as `died`. Changed the case branch and related examples to use `died`.
- The "critical events" example used `oom`, which is not listed as a supported Podman event status in the official `podman events` documentation. Replaced it with the documented `kill` event.
- The JSON output example omitted common documented fields and used a timestamp without timezone information. Updated it to match the official JSON Lines shape more closely.
- The `tee` example wrote JSON string values to `statuses.log`. Changed `jq '.Status'` to `jq -r '.Status'` so the log contains plain status names.
- The logging example wrote to `/var/log/podman-realtime.log`, which typically requires elevated privileges and is a poor default for rootless Podman examples. Changed it to `/tmp/podman-realtime.log`.
- The reconnect script comment said the stream exits if the Podman service restarts, which is only one possible disconnection scenario. Reworded it to describe event stream disconnection generally.
- The timestamp section described the Go template as customizing the timestamp format, but the example customizes the overall event output format. Reworded that sentence and comment.

## Review Notes
Podman documents that `die` is mapped to `died` for Docker compatibility when filtering events, but the emitted status is documented as `died`, so the post now uses `died` consistently.
