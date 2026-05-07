# Validation Summary: How to Use the Podman REST API to Get Container Stats

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Podman REST API
- Docker-compatible Podman API
- Bash
- `curl`
- `jq`

## Sources Consulted
- Podman `podman system service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman API reference index: https://docs.podman.io/en/latest/Reference.html
- Podman API route registration (`register_containers.go`): https://raw.githubusercontent.com/containers/podman/main/pkg/api/server/register_containers.go
- Libpod stats handler: https://raw.githubusercontent.com/containers/podman/main/pkg/api/handlers/libpod/containers_stats.go
- Compat stats handler: https://raw.githubusercontent.com/containers/podman/main/pkg/api/handlers/compat/containers_stats.go
- Compat stats payload implementation (Linux): https://raw.githubusercontent.com/containers/podman/main/pkg/api/handlers/compat/containers_stats_linux.go
- Container stats type definitions: https://raw.githubusercontent.com/containers/podman/main/libpod/define/containerstate.go
- Container stats implementation: https://raw.githubusercontent.com/containers/podman/main/libpod/stats_common.go
- Podman v5.7 libpod stats handler for current stable behavior confirmation: https://raw.githubusercontent.com/containers/podman/v5.7.0/pkg/api/handlers/libpod/containers_stats.go

## Issues Found
- The post treated `GET /libpod/containers/stats` as returning either a bare stats object or a bare array. Current Podman returns a response object with a `Stats` array. I updated the sample response, the prose, the streaming `jq` example, the monitoring script, and the network I/O script to use the real response shape.
- The libpod stats field examples were outdated. Current Podman v5-era libpod stats expose per-interface data under `Network` instead of `NetInput` and `NetOutput`. I replaced the response example and field table accordingly.
- The `MemLimit` explanation was inaccurate. Current Podman reports an effective memory limit rather than using `0` to represent “no limit” in this response. I corrected the description.
- The compat endpoint versioning was inconsistent and outdated. The article mixed `/v4.0.0/containers/...` and `/v1.41/containers/...`, while Podman documents Docker API compatibility at `v1.40`. I standardized the compat examples to `/v1.40/...`.
- The manual CPU calculation example would not work as written because it used `stream=false&one-shot=true` while reading `precpu_stats`, but Podman’s one-shot/non-streaming behavior does not provide the delta needed for that calculation. I replaced it with a two-sample streaming example that can compute CPU percentage correctly.
- The compat endpoint description overstated the memory detail available in the current payload. The current implementation exposes raw cumulative CPU counters, memory usage/limit, and per-interface network stats, but not the detailed cache/RSS/swap breakdown claimed in the draft. I corrected that description.
- The error-handling section incorrectly claimed that a stopped container on `/libpod/containers/stats` returns `409`. I replaced that example with a real documented error case: `stream=true&one-shot=true` on the compat endpoint returns `400`.
- The libpod endpoint parameter list was incomplete for current Podman. I added the `all` query parameter.

## Review Notes
- The examples continue to use `/run/podman/podman.sock`, which is valid for a rootful or explicitly configured service. Podman’s official `podman system service` documentation notes that the default rootless socket is `$XDG_RUNTIME_DIR/podman/podman.sock`.
- Podman accepts versioned API paths without strictly rejecting unsupported version strings. The article was updated to use a v5 libpod path and a v1.40 compat path so the examples match the current API shape and the documented compatibility layer.
- The generated API documentation is sufficient for endpoint discovery, but exact payload behavior for stats was verified against Podman’s source handlers and type definitions because the generated response model is not fully descriptive for `/libpod/containers/stats`.
