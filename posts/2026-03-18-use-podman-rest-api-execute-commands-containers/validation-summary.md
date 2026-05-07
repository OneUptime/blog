# Validation Summary: How to Use the Podman REST API to Execute Commands in Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman REST API (Libpod exec endpoints)
- Bash
- curl
- jq
- Alpine Linux / BusyBox

## Sources Consulted
- Podman system service docs: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman exec CLI docs: https://docs.podman.io/en/stable/markdown/podman-exec.1.html
- Podman exec API route definitions: https://github.com/containers/podman/blob/main/pkg/api/server/register_exec.go
- Podman exec API handler implementation: https://github.com/containers/podman/blob/main/pkg/api/handlers/compat/exec.go
- Podman attach stream format documentation in the official Podman source: https://github.com/containers/podman/blob/main/pkg/api/server/register_containers.go
- Alpine BusyBox overview: https://wiki.alpinelinux.org/wiki/BusyBox
- BusyBox applet reference: https://busybox.net/BusyBox.html

## Issues Found
- The post used `/run/podman/podman.sock` throughout without clarifying that this is the rootful socket. I updated the prerequisites and examples to use the default rootless socket path via `$XDG_RUNTIME_DIR/podman/podman.sock`, and noted the rootful alternative, to match the official `podman system service` documentation.
- The post said the exec start response body contains command output directly. In Podman, non-TTY exec sessions use the same attach-style multiplexed stream format as the attach endpoint. I corrected the explanation and added `"Tty": true` to the examples that print the response directly with plain `curl`.
- The inspect endpoint examples used `/libpod/exec/$EXEC_ID/inspect`, but the official Libpod inspect endpoint is `/libpod/exec/{id}/json`. I updated all inspect examples to use `/json`.
- The reusable script used `ps aux` inside `alpine:latest`. Alpine uses BusyBox by default, and BusyBox `ps` does not document GNU-style `aux` usage. I replaced that example with `ps`.
- The error-handling section mapped `409` on exec creation to “container is not running,” which does not match the documented Libpod create behavior. I corrected the text to distinguish create-time paused-container `409` responses from start-time not-running `409` responses, and I made the standalone curl example self-contained by removing its undeclared `$API` dependency.

## Review Notes
- The guide uses `v4.0.0` in the API path. Podman documents that the server does not reject requests with an unsupported version set, so this remains acceptable, but it is version-pinned example syntax rather than a requirement.
