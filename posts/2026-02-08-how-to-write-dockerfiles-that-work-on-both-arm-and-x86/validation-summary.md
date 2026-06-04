# Validation Summary: How to Write Dockerfiles That Work on Both ARM and x86

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile
- Docker Buildx
- Docker BuildKit
- QEMU
- Multi-platform container images and manifest lists
- Go cross-compilation
- Rust cross-compilation
- GitHub Actions

## Sources Consulted
- Docker Docs: Multi-platform builds - https://docs.docker.com/build/building/multi-platform/
- Docker Docs: Build variables - https://docs.docker.com/build/building/variables/
- Docker Docs: `docker buildx build` CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: Multi-platform image with GitHub Actions - https://docs.docker.com/build/ci/github-actions/multi-platform/
- Docker Docs: GitHub Actions cache backend - https://docs.docker.com/build/cache/backends/gha/
- Docker Build Push Action documentation - https://github.com/docker/build-push-action
- Docker Setup QEMU Action documentation - https://github.com/docker/setup-qemu-action
- Docker Setup Buildx Action documentation - https://github.com/docker/setup-buildx-action
- Docker Login Action documentation - https://github.com/docker/login-action
- GitHub Actions Checkout documentation - https://github.com/actions/checkout
- The Go Programming Language: installing from source / environment variables - https://go.dev/doc/install/source
- The rustup book: cross-compilation - https://rust-lang.github.io/rustup/cross-compilation.html
- The Cargo Book: configuration and target linker environment variables - https://doc.rust-lang.org/cargo/reference/config.html
- Local Docker CLI help for `docker buildx build`, `docker buildx create`, and `docker buildx imagetools inspect`
- Local manifest inspections for `python:3.12-slim`, `nginx:alpine`, and `rust:1.76-slim`
- Local package checks for Debian Bookworm and Ubuntu 22.04 examples

## Issues Found
- The post said `--push` was required because multi-platform images cannot be loaded into the local Docker daemon directly. Docker's current docs note that Docker Desktop and Docker Engine 29.0+ can use the containerd image store for multi-platform images, while the `docker-container` builder still does not load results automatically. Updated the wording to describe the `docker-container` builder behavior accurately.
- The architecture naming example used `curl` in `debian:bookworm-slim` without installing it. Added `apt-get update`, installation of `ca-certificates` and `curl`, and apt list cleanup.
- The Rust cross-compilation example only handled ARM64 explicitly. On an ARM64 build host targeting AMD64, the original fallback `cargo build --release` would build for the build platform rather than the requested target. Updated the snippet to map both `amd64` and `arm64` to explicit Rust target triples, install the matching cross-linker packages, set Cargo linker environment variables, and copy from the target-specific output directory.
- The GitHub Actions workflow used older major versions of several actions. Updated the workflow to match current official examples: `actions/checkout@v5`, `docker/setup-qemu-action@v4`, `docker/setup-buildx-action@v4`, `docker/login-action@v4`, and `docker/build-push-action@v7`.

## Review Notes
The remaining examples are technically valid for the stated purpose. The Go and Rust base image versions shown are older pinned examples; they still exist and support the relevant platforms, but future updates could refresh them to newer language and distro versions for security maintenance.
