# Validation Summary: How to Write an Efficient Containerfile for Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Containerfile / Dockerfile syntax
- Buildah-backed image builds
- Node.js container images
- Go container images
- Alpine Linux
- Distroless images
- Container health checks

## Sources Consulted
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman CLI documentation: https://docs.podman.io/en/v4.0.0/markdown/podman.1.html
- Dockerfile reference: https://docs.docker.com/reference/dockerfile
- Docker storage drivers and layer behavior: https://docs.docker.com/engine/storage/drivers/
- Docker build cache optimization: https://docs.docker.com/build/cache/optimize/
- Node Docker Official Image documentation: https://hub.docker.com/_/node
- Node.js End-Of-Life schedule: https://nodejs.org/en/about/eol
- Go release policy and release history: https://go.dev/doc/devel/release
- Go Docker Official Image documentation: https://hub.docker.com/_/golang/
- Alpine Docker Official Image tags: https://hub.docker.com/_/alpine?tab=tags
- Distroless official repository and image list: https://github.com/GoogleContainerTools/distroless

## Issues Found
- The layer explanation said every Containerfile instruction creates a new layer. That is not strictly correct: filesystem-changing instructions such as `COPY`, `ADD`, and `RUN` create layers, while some instructions only update image metadata. I corrected the explanation and the follow-up caching description.
- The `.containerignore` section said Podman sends the directory to a build daemon. Podman is daemonless, and the official docs describe `.containerignore` in terms of the build context used for `COPY` and `ADD`. I updated that wording.
- The Node.js examples used `node:20` and `gcr.io/distroless/nodejs20-debian12`. Node.js 20 reached End-of-Life on March 24, 2026, so those examples were outdated as of the review date. I updated them to supported Node 24 images and the current distroless Node 24 runtime image.
- The Go multi-stage example used older image tags (`golang:1.22-alpine` and `alpine:3.19`). I updated them to current supported tags (`golang:1.26-alpine` and `alpine:3.23`).
- The base image comparison used fixed size estimates and described distroless as having “fewer vulnerabilities.” Exact image sizes vary over time and by architecture, and the distroless project documents reduced package surface and improved scanner signal-to-noise rather than guaranteeing fewer vulnerabilities. I replaced that wording with version-stable, documentation-aligned language.
- The health-check introduction was broadened to “orchestration tools” without qualification. I narrowed that wording to tooling that reads container health status.

## Review Notes
- The post is now technically sound for publication after the fixes above.
- Podman was not available in the local shell environment during review, so command verification was done against official documentation rather than local `podman --help` output.
