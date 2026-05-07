# Validation Summary: How to Use Podman for Reproducible Builds

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Containerfiles / Dockerfiles
- Reproducible builds
- Go
- Node.js and npm
- Python, pip, `build`, and pip-tools
- Rust and Cargo
- GCC / C/C++
- Git

## Sources Consulted
- Podman build docs: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman image inspect docs: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Go command docs: https://pkg.go.dev/cmd/go
- Go linker docs: https://pkg.go.dev/cmd/link
- npm `ci` docs: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- pip secure installs docs: https://pip.pypa.io/en/stable/topics/secure-installs/
- PyPA build installation docs: https://build.pypa.io/en/stable/installation.html
- PyPA build process docs: https://build.pypa.io/en/stable/explanation/how-it-works.html
- pip-tools `pip-compile` docs: https://pip-tools.readthedocs.io/en/stable/cli/pip-compile/
- Cargo command docs: https://doc.rust-lang.org/cargo/commands/cargo.html
- Docker base images / `scratch` docs: https://docs.docker.com/build/building/base-images/
- Docker Official Images manifests checked via local `docker buildx imagetools inspect` for `golang:1.22`, `node:20`, `python:3.12`, `rust:1.77`, and `debian:bookworm-slim`

## Issues Found
- Several `FROM ...@sha256:...` examples used truncated placeholder digests, which are not valid image references. I replaced them with full valid digests.
- The Go vendoring Dockerfile did not copy the application source before running `go build ./cmd/server`, so the example would fail. I added `COPY . .`.
- The Python example ran `python -m build` without installing the `build` frontend. On the official `python:3.12` image this fails with `No module named build`, so I added an explicit install step and switched to `python -m pip`.
- The explanation of Go `-buildid=` described it as replacing a timestamp-based ID. Go documents it as the Go toolchain build ID, so I corrected the explanation to match the toolchain behavior.
- The Rust multi-stage example built on the Debian-based `rust:1.77` image and copied the resulting binary into `FROM scratch`. A default binary built that way is dynamically linked, so it would not run in `scratch`. I changed the runtime stage to a pinned `debian:bookworm-slim` image and added `--locked` to the Cargo builds.
- The Podman scripts used `podman inspect` generically where the image-specific command is clearer and documented. I changed those calls to `podman image inspect`.
- `verify-reproducible.sh` accepted a commit argument but never built that commit and cleaned up the wrong tag. I fixed it to use the current `HEAD` tag consistently.
- `generate-provenance.sh` looked up `myapp:latest` even though the build script tags images as `myapp:$COMMIT_SHA`, and it could emit invalid JSON if `SOURCE_DATE_EPOCH` was unset. I fixed the tag reference, initialized `SOURCE_DATE_EPOCH`, and added strict shell options.

## Review Notes
- The hard-coded example digests are valid as of 2026-05-07, but they will naturally age as upstream tags move. Readers should re-resolve digests for their own builds instead of treating the example values as permanent.
- `npm ci --ignore-scripts` is technically correct and reduces non-determinism, but projects that rely on install or postinstall scripts may need a different reproducibility strategy.
