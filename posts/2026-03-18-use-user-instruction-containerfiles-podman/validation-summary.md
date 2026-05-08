# Validation Summary: How to Use USER Instruction in Containerfiles for Podman

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Podman
- Containerfile / Dockerfile syntax
- Rootless containers and user namespaces
- Linux users, groups, UIDs, and GIDs
- Python, Node.js, Go, Alpine, Nginx, and distroless container images

## Sources Consulted
- Podman `podman-run` manual: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Dockerfile builder reference for `USER`, `COPY --chown`, and `COPY --chmod`: https://docs.docker.com/reference/dockerfile/
- Distroless project README: https://github.com/GoogleContainerTools/distroless/blob/main/README.md
- Node.js release schedule: https://github.com/nodejs/Release
- Go release policy and history: https://go.dev/doc/devel/release
- Alpine Linux release branches: https://alpinelinux.org/releases/
- Debian `useradd(8)` manual: https://manpages.debian.org/bookworm/passwd/useradd.8.en.html

## Issues Found
- Updated `node:20-alpine` examples to `node:24-alpine` because Node.js 20 reached end-of-life on April 30, 2026.
- Updated `golang:1.22-alpine` examples to `golang:1.26-alpine` because Go supports only the current and previous major releases, and Go 1.22 is outside that support window.
- Updated the Alpine runtime image from `alpine:3.19` to `alpine:3.23` because Alpine 3.19 is past normal support.
- Corrected the distroless guidance. The original text said distroless has no `/etc/passwd`; the accurate guidance is that numeric UIDs avoid username lookups and work even when the desired user name is not present.
- Corrected the Nginx and low-port wording. The main Podman-specific limitation is that rootless Podman cannot publish privileged host ports below 1024 by default.
- Added `gosu` installation to the entrypoint example because the script uses `gosu`, but the original Dockerfile did not install it.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against official Podman documentation instead of local `--help` output.
