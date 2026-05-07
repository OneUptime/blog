# Validation Summary: How to Use the Podman REST API with Go

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Podman Libpod REST API
- Go
- Unix domain sockets
- HTTP client programming

## Sources Consulted
- Podman `podman system service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman API reference entry point: https://docs.podman.io/en/latest/_static/api.html
- Podman OpenAPI definition used by the API reference: https://storage.googleapis.com/libpod-master-releases/swagger-latest.yaml
- Podman create handler and create response behavior: https://github.com/containers/podman/blob/main/pkg/api/handlers/libpod/containers_create.go
- Podman log streaming handler: https://github.com/containers/podman/blob/main/pkg/api/handlers/compat/containers_logs.go
- Podman start and stop handlers: https://github.com/containers/podman/blob/main/pkg/api/handlers/compat/containers_start.go and https://github.com/containers/podman/blob/main/pkg/api/handlers/compat/containers_stop.go
- Podman request/response types and inspect structs: https://github.com/containers/podman/blob/main/pkg/domain/entities/types/types.go, https://github.com/containers/podman/blob/main/pkg/domain/entities/types/container_ps.go, https://github.com/containers/podman/blob/main/libpod/define/container_inspect.go
- Podman `SpecGenerator` and networking fields: https://github.com/containers/podman/blob/main/pkg/specgen/specgen.go and https://github.com/containers/common/blob/main/libnetwork/types/network.go

## Issues Found
- The opening `info` example had a compile-quality problem and unsafe decoding flow. It imported `io` without using it, did not check `resp.StatusCode`, and relied on unchecked `map[string]interface{}` assertions. I changed it to validate `200 OK`, decode into a typed struct, and exit cleanly on decode failures.
- The client methods for listing, creating, and inspecting containers did not consistently validate HTTP status codes before decoding. I added explicit status checks so error responses are surfaced correctly instead of being decoded into the wrong shape.
- The `StartContainer` and `StopContainer` helpers accepted `200 OK`, but Podman documents and implements `204 No Content` for success and `304 Not Modified` for already-running/already-stopped cases. I updated the examples to handle `204` and `304` instead.
- The `GetLogs` and `streamLogs` examples were technically incorrect for the Libpod logs endpoint. Podman’s Libpod logs API returns the same framed stream format used by attach, not plain text bytes. I added a `readLogFrame` helper and updated both examples to strip the 8-byte frame headers before returning or printing log content.

## Review Notes
- The examples use `/run/podman/podman.sock`, which is the documented default rootful socket. Rootless deployments commonly use `$XDG_RUNTIME_DIR/podman/podman.sock`.
- Podman’s APIs are versioned, but the server does not reject requests solely because the version segment is unsupported. The post’s `v4.0.0` path is therefore still a valid example format, though newer Podman releases expose newer version strings in current documentation.
- The local workspace does not have the Go toolchain installed, so I could not run `go test` or compile the snippets locally. The review was completed against Podman’s official documentation, OpenAPI definition, and upstream source.
