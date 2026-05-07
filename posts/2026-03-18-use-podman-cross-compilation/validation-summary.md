# Validation Summary: How to Use Podman for Cross-Compilation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- QEMU user-mode emulation
- Multi-architecture container images and manifest lists
- Go cross-compilation
- C and C++ cross-compilation toolchains
- CMake toolchain files
- Rust cross-compilation
- GitHub Actions

## Sources Consulted
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman manifest overview: https://docs.podman.io/en/v5.4.2/markdown/podman-manifest.1.html
- Podman manifest create documentation: https://docs.podman.io/en/stable/markdown/podman-manifest-create.1.html
- Podman manifest add documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Podman manifest push documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Podman pull documentation: https://docs.podman.io/en/v4.4/markdown/podman-pull.1.html
- `multiarch/qemu-user-static` project documentation: https://github.com/multiarch/qemu-user-static
- Red Hat knowledgebase note on `qemu-user-static` availability in RHEL: https://access.redhat.com/solutions/5654221
- Go installation and `GOOS`/`GOARCH` reference: https://go.dev/doc/install/source
- rustup cross-compilation guide: https://rust-lang.github.io/rustup/cross-compilation.html
- Cargo configuration reference: https://doc.rust-lang.org/cargo/reference/config.html
- CMake toolchains manual: https://cmake.org/cmake/help/latest/manual/cmake-toolchains.7.html
- GitHub Actions runner image software list: https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md

## Issues Found
- The QEMU package install guidance incorrectly grouped Fedora and RHEL together. I changed it to Fedora only because Red Hat does not ship `qemu-user-static` in standard RHEL repositories.
- The Go cross-compilation Containerfile wrote outputs into `/output` without creating that directory first. I added `RUN mkdir -p /output` so the `go build -o /output/...` commands work.
- The Rust example tried to run the `rust-cross-env` image without building it first. I added `podman build -t rust-cross-env .` before the `podman run` command.
- The manifest creation logic in `cross-build.sh` used `cmd1 || cmd2 && cmd3`, which is unsafe with shell operator precedence and `set -euo pipefail`. I replaced it with an explicit `podman manifest exists` check followed by `rm` and `create`.
- The GitHub Actions example used the unqualified image name `multiarch/qemu-user-static`. I changed it to `docker.io/multiarch/qemu-user-static` to avoid Podman short-name resolution ambiguity in CI.

## Review Notes
- The post is Linux-host oriented. On macOS and Windows, Podman typically runs inside a Linux VM, so emulation tooling must be available in that VM rather than on the desktop host.
- The Go example is valid for typical pure-Go cross-builds. Projects that rely on CGO need additional target-specific C toolchains and configuration.
