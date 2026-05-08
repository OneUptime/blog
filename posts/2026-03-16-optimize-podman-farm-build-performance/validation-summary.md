# Validation Summary: How to Optimize Podman Farm Build Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman farm builds
- Podman remote connections
- Containerfile/Dockerfile builds
- `.containerignore`
- Multi-stage container builds
- SSH client configuration
- containers/image `registries.conf`
- Node.js container images
- Go container images

## Sources Consulted
- Podman `podman-farm-build` documentation: https://docs.podman.io/en/latest/markdown/podman-farm-build.1.html
- Podman `podman-build` documentation, including `.containerignore`: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `podman-system-prune` documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- containers/image `containers-registries.conf` manual: https://www.mankier.com/5/containers-registries.conf
- Node.js official release schedule: https://github.com/nodejs/Release
- Node Docker Official Image tags: https://hub.docker.com/_/node
- Go official release history and support policy: https://go.dev/doc/devel/release
- Go Docker Official Image tags: https://hub.docker.com/_/golang/

## Issues Found
- The Node examples used `node:20-alpine`. Node.js 20 reached end of life on 2026-04-30, so the examples now use `docker.io/library/node:24-alpine`, an active LTS Docker Official Image tag.
- The Go example used `golang:1.21`, which is no longer a supported Go release under the Go project's two-release support policy. It now uses `docker.io/library/golang:1.26-alpine`.
- The pre-warm script used outdated base image tags and short image names. It now uses current fully qualified Docker Hub references so Podman farm/CI environments do not depend on short-name resolution.
- The multi-stage build explanation said data is transferred back from farm nodes. Podman farm build pushes built images from farm nodes to the registry and creates/pushes a manifest list, so the wording now says multi-stage builds reduce image data pushed from farm nodes to the registry.

## Review Notes
- The `podman farm build --farm ... -t ... .`, `podman --connection ... pull`, `.containerignore`, registry mirror, SSH multiplexing, and `podman system prune --filter until=168h` examples are consistent with the consulted documentation.
- The registry mirror snippet is syntactically valid TOML for `registries.conf`; in production, mirror freshness and tag synchronization should be managed carefully when pulling by tag.
