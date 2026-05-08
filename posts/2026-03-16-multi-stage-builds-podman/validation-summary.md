# Validation Summary: How to Use Multi-Stage Builds with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containerfile / Dockerfile syntax
- Multi-stage container builds
- Go
- Node.js and npm
- Python virtual environments
- Rust and Cargo
- Alpine, Debian slim, BusyBox, and Redis container images

## Sources Consulted
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Docker multi-stage build documentation: https://docs.docker.com/build/building/multi-stage/
- Dockerfile reference for FROM and COPY --from: https://docs.docker.com/reference/builder
- npm ci documentation: https://docs.npmjs.com/cli/v10/commands/npm-ci/
- Node.js release schedule: https://github.com/nodejs/Release
- Node.js Docker Official Image repository: https://github.com/nodejs/docker-node
- Go release history and support policy: https://go.dev/doc/devel/release
- Go Docker Official Image tags: https://hub.docker.com/_/golang
- Python version status: https://devguide.python.org/versions/
- Python Docker Official Image tags: https://hub.docker.com/_/python
- Python venv documentation: https://docs.python.org/3/library/venv.html
- Rust Docker Official Image tags: https://hub.docker.com/_/rust

## Issues Found
- The Go examples used `golang:1.22` and `go 1.22`, which is outside Go's currently supported release window as of 2026-05-08. Updated the examples to `golang:1.26` and `go 1.26`.
- The Node.js examples used `node:20`, which reached end-of-life on 2026-04-30 according to the official Node.js release schedule. Updated the examples to Node.js 24 images.
- The Node.js production install used `npm ci --production`. npm documents `--omit=dev` as the current way to omit development dependencies, so the command was updated to `npm ci --omit=dev`.
- The Python example used Python 3.12, which is still supported for security fixes but no longer the current bugfix series. Updated the example to the current supported Python 3.14 image tags.
- The Python section implied that copying a virtual environment is generally enough for dependencies compiled with system libraries. Python virtual environments are not generally relocatable, and compiled dependencies may still need runtime shared libraries. Adjusted the wording so the example copies the environment to the same path in a matching runtime image.
- The Rust example used `rust:1.77`, an old Rust image tag. Updated it to the current Rust Docker Official Image tag family, `rust:1.94`.
- The three-stage Node.js example copied `node_modules` from a Debian-based Node image into an Alpine runtime. That can break native dependencies because Debian/glibc and Alpine/musl environments differ. Updated all three stages to use `node:24-alpine`.
- The three-stage Node.js runtime copied development dependencies from the dependencies stage into the production image. Added `npm prune --omit=dev` in the runtime stage so the final image keeps production dependencies only.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against official Podman documentation rather than local `podman --help` output. The post's core explanation of multi-stage builds, named stages, and `COPY --from` matches the official Dockerfile/Containerfile behavior.
