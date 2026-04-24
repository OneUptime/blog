# Validation Summary: How to Fix 'Unable to Retrieve Image Details' After Docker Update (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Engine API
- Docker CLI
- Docker BuildKit
- Docker Compose
- Docker Scout

## Sources Consulted
- Docker Engine API reference: https://docs.docker.com/reference/api/engine/
- Docker deprecated features: https://docs.docker.com/engine/deprecated/
- Docker BuildKit documentation: https://docs.docker.com/build/buildkit/
- `docker image pull` reference: https://docs.docker.com/reference/cli/docker/image/pull/
- `docker image inspect` reference: https://docs.docker.com/reference/cli/docker/image/inspect/
- `docker buildx imagetools inspect` reference: https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- Compose Build Specification: https://docs.docker.com/reference/compose-file/build/
- `docker scout cves` reference: https://docs.docker.com/reference/cli/docker/scout/cves/
- Portainer Docker Standalone upgrade docs: https://docs.portainer.io/start/upgrade/docker
- Portainer API access docs: https://docs.portainer.io/2.21/api/access
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer CE Docker image Dockerfile: https://github.com/portainer/portainer/blob/develop/build/linux/Dockerfile
- Portainer snapshot endpoint handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_snapshot.go
- Portainer 2.33 LTS release notes: https://docs.portainer.io/2.33-lts/release-notes

## Issues Found
- The post hard-coded Docker API version `v1.45` in direct socket calls. I changed the examples to detect the daemon's current API version first, because current Docker docs deprecate older API versions and current engines negotiate newer versions.
- The post stated that Docker Engine 29+ uses OCI image format by default. I corrected this to check the registry manifest media type instead, because Docker docs describe Docker and OCI media types as registry/export format details rather than a blanket Docker Engine 29 default.
- The post used `docker manifest inspect` for manifest checks. I replaced those examples with `docker buildx imagetools inspect`, which is the current documented command for inspecting registry manifests.
- The Portainer upgrade example used `portainer/portainer-ce:latest` and a nonstandard run command. I corrected this to the documented `portainer/portainer-ce:lts` upgrade flow from Portainer's Docker Standalone docs and changed the pre-check to a Docker-native image inspection command.
- The post claimed BuildKit became the default in Docker Engine 29+ and implied Portainer 2.20+ was the relevant compatibility threshold. I corrected this to note that BuildKit has been the default Linux builder since Docker Engine 23.0 and that Docker v29 support was added in Portainer 2.33.5 LTS / 2.36.0 STS and later.
- The Portainer snapshot example authenticated over legacy HTTP on port `9000` and called `/api/endpoints/1/docker/snapshot`, which is not the snapshot endpoint. I changed this to the documented HTTPS/API-key pattern and the actual snapshot route `/api/endpoints/1/snapshot`.
- The socket-permissions section implied an exact socket ownership string and said checking `HostConfig.Binds` verified container user access. I corrected this to the technically accurate checks: ownership/mode are typically `root:docker`, and the bind inspection verifies the socket is mounted into the container.
- The final section said `docker scout cves` was `docker scan` and described `docker save | docker load` as an integrity check. I corrected the terminology and reframed the save/load round-trip as a way to rule out local image-store issues.

## Review Notes
- Portainer's current docs recommend HTTPS on `9443`; port `9000` is legacy HTTP and should only be kept if there is a specific need for it.
- `docker buildx imagetools inspect` checks registry manifests, so for private or local-only images the equivalent troubleshooting step is usually to rebuild locally and inspect with `docker image inspect`.
- `journalctl -u docker` in Step 1 is Linux systemd-specific. The command itself is valid, but readers on non-systemd hosts will need to use their platform's Docker daemon log mechanism instead.
