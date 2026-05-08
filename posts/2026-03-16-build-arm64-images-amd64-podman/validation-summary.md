# Validation Summary: How to Build ARM64 Images on AMD64 with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containerfile / Dockerfile syntax
- QEMU user-mode emulation
- binfmt_misc
- Multi-architecture container images
- Go cross-compilation
- Rust cross-compilation
- Node.js container builds
- Alpine Linux
- npm

## Sources Consulted
- Podman `build` documentation: https://docs.podman.io/en/latest/markdown/podman-build.1.html
- Podman `run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman `manifest add` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Podman `manifest push` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Podman multi-architecture manifest article: https://podman.io/blogs/2021/10/11/multiarch.html
- QEMU emulation documentation: https://www.qemu.org/docs/master/about/emulation.html
- Alpine Linux downloads and release branches: https://www.alpinelinux.org/downloads/ and https://www.alpinelinux.org/releases/
- Node.js release schedule: https://github.com/nodejs/Release
- npm `ci` documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- Go downloads page and Go 1.26 release notes: https://go.dev/dl/ and https://go.dev/doc/go1.26
- Rust release announcements: https://blog.rust-lang.org/releases/
- Docker build variable documentation for standard platform build arguments: https://docs.docker.com/build/building/variables/

## Issues Found
- The post used `alpine:3.19`, which is out of support as of 2025-11-01. Updated Alpine examples to `alpine:3.23`, the current supported Alpine branch as of 2026-05-08.
- The Go example used `golang:1.22-alpine`, which is no longer a supported Go toolchain. Updated it to `golang:1.26-alpine`, matching the current Go release documented by the Go project.
- The Rust example used `rust:1.77-alpine`, an old compiler release. Updated it to `rust:1.95-alpine`, matching the latest Rust stable release listed by the Rust project.
- The Node.js example used `node:20-alpine`; Node.js 20 reached end-of-life on 2026-04-30. Updated it to `node:24-alpine`, the current LTS line.
- The Node.js section stated that Node.js cannot cross-compile. That was too broad: pure JavaScript does not need compilation, while native dependencies usually need target-platform installation or compilation. Reworded the claim accordingly.
- The Node.js example used `npm ci --production`. Updated it to the current npm form, `npm ci --omit=dev`.
- The binary inspection example assumed the runtime image already contained the `file` command. Updated the command to install `file` inside the disposable Alpine-based test container before running it.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was checked against official Podman documentation rather than local `--help` output. The manifest commands and `--platform` usage match current Podman documentation. The Rust cross-compilation example may still require extra linker packages for projects with C dependencies; the existing example is appropriate for simple Rust/musl builds, but future revisions could add a note for native dependencies.
