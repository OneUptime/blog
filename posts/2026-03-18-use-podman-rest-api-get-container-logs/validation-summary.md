# Validation Summary: How to Use the Podman REST API to Get Container Logs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Podman REST API
- Docker-compatible Podman API
- Bash
- curl
- jq
- Python 3

## Sources Consulted
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman API reference: https://docs.podman.io/en/latest/_static/api.html
- Podman logs command documentation: https://docs.podman.io/en/latest/markdown/podman-logs.1.html
- Podman v4.0 API specification: https://storage.googleapis.com/libpod-master-releases/swagger-v4.0.yaml
- Podman v4.0 route registration for container endpoints: https://raw.githubusercontent.com/containers/podman/v4.0.0/pkg/api/server/register_containers.go
- Podman v4.0 logs handler implementation: https://raw.githubusercontent.com/containers/podman/v4.0.0/pkg/api/handlers/compat/containers_logs.go
- Podman v4.0 time parsing implementation: https://raw.githubusercontent.com/containers/podman/v4.0.0/pkg/util/utils.go

## Issues Found
- The post said the service check used the "version endpoint", but the example called `GET /libpod/info`. I corrected the wording to "info endpoint" so the explanation matches the request being shown.
- Several `logs` examples omitted `stdout` and `stderr`, and the parameter descriptions said those options default to `true`. Podman's logs handler rejects requests unless at least one stream is explicitly selected, so I fixed the descriptions and added `stdout=true&stderr=true` to the affected examples.
- The post treated the `libpod` logs response as plain text. Podman's `libpod` logs route returns a framed stream, so I added a note about demultiplexing and corrected the timestamp, scripting, and error-handling examples to decode the framed response before treating it as text.
- The Docker-compatible example used `v1.41`. Podman's official documentation describes the compatibility layer as Docker `v1.40`, so I updated the example and explanation accordingly.
- The phrase "relative timestamps with Unix epoch format" did not match the example shown. I corrected that wording to "Unix epoch timestamps."

## Review Notes
- The post continues to use the `v4.0.0` libpod path. Podman's service documentation states that the server does not reject unsupported API version strings, so the versioned examples remain acceptable.
- Both the `libpod` and Docker-compatible log endpoints return streams rather than JSON objects. Framing behavior differs by route and TTY configuration, so examples that consume the body as text need explicit decoding logic.
