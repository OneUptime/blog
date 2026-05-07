# Validation Summary: How to Create a Scratch-Based Image with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containerfile / Dockerfile syntax
- scratch container images
- Go static binaries
- Rust musl static binaries
- C static binaries with musl
- Alpine Linux
- Node.js frontend builds
- Distroless images

## Sources Consulted
- Docker Docs, Base images and `FROM scratch`: https://docs.docker.com/build/building/base-images/
- Docker Docs, Dockerfile reference for multi-stage `COPY --from` and `COPY --chown`: https://docs.docker.com/reference/dockerfile/
- Podman documentation, `podman build` options including `--build-arg` and `--target`: https://docs.podman.io/en/v3.4.4/markdown/podman-build.1.html
- Podman documentation, `podman run --tmpfs`: https://docs.podman.io/en/v4.4/markdown/podman-run.1.html
- Podman documentation, `podman mount` rootful/rootless behavior: https://docs.podman.io/en/v5.1.2/markdown/podman-mount.1.html
- Podman command documentation for `cp`, `inspect`, and `logs`: https://docs.podman.io/en/stable/Commands.html
- Go release history and support policy: https://go.dev/doc/devel/release
- Go `crypto/x509` documentation for system certificate pools: https://pkg.go.dev/crypto/x509
- Rust Reference, linkage and musl target static C runtime defaults: https://doc.rust-lang.org/stable/reference/linkage.html
- Rust release announcements: https://blog.rust-lang.org/releases/
- Alpine Linux release branches and support status: https://www.alpinelinux.org/releases/
- Alpine Linux downloads, current stable release: https://www.alpinelinux.org/downloads/
- Node.js release schedule and LTS/EOL status: https://nodejs.org/en/about/previous-releases
- GoogleContainerTools Distroless README: https://github.com/GoogleContainerTools/distroless

## Issues Found
- The post used outdated builder image pins: `golang:1.22-alpine`, `rust:1.77-slim`, `alpine:3.19`, and `node:20-alpine`. Updated examples to currently supported versions: Go 1.26, Rust 1.95, Alpine 3.23, and Node.js 24 LTS.
- The HTTPS certificate claim said any HTTPS connection would fail without CA certificates. Changed it to standard HTTPS connections that rely on system roots, because applications can use custom or embedded roots.
- The temporary-file guidance said to create `/tmp` in an entrypoint, which can be misleading for scratch images that do not include a shell. Changed this to application startup code.
- The `podman mount` debugging example said it requires root. Podman documentation distinguishes rootful mounting from rootless mounting via `podman unshare`, so the example now includes both forms.
- The distroless comparison implied all distroless images include glibc, timezone data, and user configuration. Updated the wording to be variant-specific and to mention common defaults such as CA certificates and non-root tags.

## Review Notes
Podman and Go were not installed in the local workspace, so their commands were verified against official documentation rather than local `--help` output. Rust tooling was available locally, and Rust musl static-linking behavior was checked against the Rust Reference.
