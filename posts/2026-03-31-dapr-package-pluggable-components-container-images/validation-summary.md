# Validation Summary: How to Package Pluggable Components as Container Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr pluggable components
- Docker (multi-stage builds, BuildKit, Buildx)
- Go (static binary compilation)
- Python (slim image packaging)
- GitHub Actions (CI/CD for container images)
- Kubernetes (security context, pod spec)
- OCI container images

## Sources Consulted
- Dapr pluggable components documentation: https://docs.dapr.io/developing-applications/develop-components/pluggable-components/pluggable-components-overview/
- Docker BuildKit automatic platform ARGs: https://docs.docker.com/build/building/multi-platform/#automatic-platform-args
- Docker Buildx documentation: https://docs.docker.com/build/builders/
- Docker multi-stage build documentation: https://docs.docker.com/build/building/multi-stage/
- Go build flags documentation: https://pkg.go.dev/cmd/go#hdr-Compile_packages_and_dependencies
- GitHub Actions docker/build-push-action: https://github.com/docker/build-push-action
- Docker Scout CLI reference: https://docs.docker.com/scout/
- Python pip install --prefix flag: https://pip.pypa.io/en/stable/cli/pip_install/

## Issues Found
1. **Hardcoded `GOARCH=amd64` in Go Dockerfile**: The Go Dockerfile hardcoded `GOARCH=amd64`, which would produce amd64 binaries even when building for arm64 via `docker buildx build --platform linux/amd64,linux/arm64`. This means the arm64 image would contain an amd64 binary that would fail at runtime on ARM nodes. Fixed by adding `ARG TARGETARCH` and changing `GOARCH=amd64` to `GOARCH=${TARGETARCH}`. Docker BuildKit automatically sets `TARGETARCH` to the correct architecture for each platform target, and defaults to the host architecture for regular `docker build` commands.

## Review Notes
- `docker/build-push-action@v5` is used in the GitHub Actions workflow. v6 is now available but v5 remains functional and is not deprecated.
- `golang:1.22-alpine` is a valid base image. Newer Go versions (1.23+) are available but 1.22 is still supported.
- The `FROM scratch` approach with `USER 65534` is correct — numeric UIDs work without `/etc/passwd` entries.
- The Python Dockerfile correctly uses `DAPR_COMPONENT_SOCKET_FOLDER` environment variable, which is the standard Dapr convention for pluggable component socket paths.
- The `docker scout cves` command is correct for Docker Scout vulnerability scanning.
