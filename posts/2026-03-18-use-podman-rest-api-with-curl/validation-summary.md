# Validation Summary: How to Use the Podman REST API with curl

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Podman REST API
- Libpod API
- curl
- jq
- Bash
- Unix domain sockets

## Sources Consulted
- Podman `podman-system-service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman v4.0 API reference index: https://docs.podman.io/en/v4.0.0/Reference.html
- Podman v4.0 OpenAPI specification: https://storage.googleapis.com/libpod-master-releases/swagger-v4.0.yaml
- Podman v4.0 `register_containers.go`: https://raw.githubusercontent.com/containers/podman/v4.0.0/pkg/api/server/register_containers.go
- Podman v4.0 `containers_create.go`: https://raw.githubusercontent.com/containers/podman/v4.0.0/pkg/api/handlers/libpod/containers_create.go
- Podman v4.0 `containers_stats.go`: https://raw.githubusercontent.com/containers/podman/v4.0.0/pkg/api/handlers/libpod/containers_stats.go
- Podman v4.0 `register_images.go`: https://raw.githubusercontent.com/containers/podman/v4.0.0/pkg/api/server/register_images.go
- Podman v4.0 `network.go` JSON field definitions: https://raw.githubusercontent.com/containers/podman/v4.0.0/vendor/github.com/containers/common/libnetwork/types/network.go
- Local `curl --help all` and `curl --version` output to verify the documented curl flags

## Issues Found
- The post did not mention that the Podman API service must be available before the `curl` examples can work. I added the official rootless and rootful `podman.socket` startup commands.
- The post presented `/run/podman/podman.sock` as the universal socket path. I clarified that this is the default rootful socket path and that rootless Podman uses `$XDG_RUNTIME_DIR/podman/podman.sock`.
- The container creation example assumed the referenced image was already present locally. I added a short note telling readers to pull the image first if needed, which matches Podman’s container-create behavior.
- The lifecycle script used the deprecated single-container stats endpoint `/libpod/containers/{name}/stats`. I replaced it with the current non-deprecated `/libpod/containers/stats?containers=...&stream=false` endpoint.
- The conclusion claimed that every Podman CLI container-management operation can be performed through the API. I softened that wording because the original claim was too absolute relative to the documented API surface and deprecations.

## Review Notes
- The post’s request and response examples for container listing, container inspection, image listing, image pull, image search, network listing/creation, volume listing/creation, and HTTP status handling were checked against the Podman v4.0 OpenAPI spec and source and are technically consistent after the fixes above.
- The examples intentionally use the `v4.0.0` Libpod API path. Podman’s `podman system service` documentation states that the server does not reject requests with an unsupported version set, so the versioned examples remain workable, but readers may also choose to align the path with the API reference for their installed Podman release.
