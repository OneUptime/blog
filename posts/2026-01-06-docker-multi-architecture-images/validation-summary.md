# Validation Summary: How to Build Multi-Architecture Docker Images (ARM64 + AMD64)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker / Docker Engine
- Docker Buildx (BuildKit)
- QEMU user-mode emulation (`tonistiigi/binfmt`)
- OCI image index / manifest lists
- Multi-stage Dockerfiles
- Go cross-compilation (`GOOS`/`GOARCH`, `CGO_ENABLED`)
- Rust cross-compilation (`rustup` targets, musl)
- Node.js Alpine base images
- GitHub Actions (`docker/setup-qemu-action`, `docker/setup-buildx-action`, `docker/login-action`, `docker/build-push-action`)
- GitLab CI (Docker-in-Docker)
- CircleCI (machine executor)
- AWS CodeBuild / Graviton

## Sources Consulted
- Docker Buildx documentation — https://docs.docker.com/build/building/multi-platform/
- `docker buildx build` / `imagetools` reference — https://docs.docker.com/reference/cli/docker/buildx/
- Dockerfile predefined build args (`TARGETPLATFORM`, `TARGETARCH`, `TARGETOS`, `TARGETVARIANT`, `BUILDPLATFORM`) — https://docs.docker.com/reference/dockerfile/#automatic-platform-args-in-the-global-scope
- tonistiigi/binfmt — https://github.com/tonistiigi/binfmt
- docker/build-push-action — https://github.com/docker/build-push-action
- docker/setup-buildx-action and docker/setup-qemu-action — https://github.com/docker/setup-buildx-action, https://github.com/docker/setup-qemu-action
- Go cross-compilation docs — https://go.dev/doc/install/source#environment
- Rust platform support / rustup targets — https://doc.rust-lang.org/rustc/platform-support.html
- Node.js download artifact naming (linux-x64 / linux-arm64) — https://nodejs.org/dist/

## Issues Found
No technical issues found.

All commands, flags, automatic build ARGs, Dockerfile patterns, output formats, and CI action versions were verified against official documentation and are correct and current. The `amd64 → x64` arch mapping for the Node binary download matches Node's real artifact naming. The `$BUILDPLATFORM` native-compile-then-cross-compile pattern is correct and idiomatic. GitHub Action major versions (`checkout@v4`, `setup-qemu-action@v3`, `setup-buildx-action@v3`, `login-action@v3`, `build-push-action@v5`) are all valid and non-deprecated.

## Review Notes
- `docker/build-push-action@v6` is now available; the post's `@v5` still works and is not deprecated, but a future refresh could bump to `@v6`.
- The statement "You can't load multi-platform images into local Docker directly" reflects the default daemon behavior. With the containerd image store enabled (increasingly the default in recent Docker Desktop / Engine), `--load` can in fact import multi-platform images. This is a version-dependent caveat, not an error in the conventional setup the post describes.
- The Rust musl example (`rustup target add` + `cargo build --target …-musl`) is illustrative. Under buildx each target platform is built in its own (often emulated) environment, so it behaves as a native-arch build rather than a true cross-arch compile; for genuine cross-arch musl builds a cross-linker (e.g. `musl-cross`/`cross`) would also be required. Acceptable as a teaching example.
- The "Separate Build Jobs Per Architecture" GitHub Actions snippet omits `actions/checkout`, buildx setup, and registry login steps for brevity. It is structurally correct and illustrative; a full runnable workflow would need those steps added.
