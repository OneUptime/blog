# Validation Summary: How to Build s390x Images with Podman

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Podman
- QEMU user-mode emulation and binfmt_misc
- s390x / IBM Z container images
- Multi-architecture OCI image manifests
- Alpine, Ubuntu, Debian, Fedora, Go, Node.js, Python, and Rust container base images
- Go cross-compilation
- Node.js and Python containerized applications

## Sources Consulted
- Podman build documentation: https://docs.podman.io/en/v4.3/markdown/podman-build.1.html
- Podman manifest push documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Podman run documentation: https://docs.podman.io/en/v3.3.0/markdown/podman-run.1.html
- Buildah build documentation: https://github.com/containers/buildah/blob/main/docs/buildah-build.1.md
- Containerfile man page for platform build arguments: https://manpages.ubuntu.com/manpages/questing/man5/Containerfile.5.html
- QEMU user-mode documentation: https://qemu-project.gitlab.io/qemu/user/main.html
- Go release/source documentation for GOOS/GOARCH and s390x: https://go.dev/doc/install/source
- Go release policy: https://go.dev/doc/devel/release
- Node.js os.arch documentation: https://nodejs.org/api/os.html
- Node.js release schedule: https://nodejs.org/en/about/releases/
- Python platform module documentation: https://docs.python.org/3/library/platform.html
- Alpine Linux release branch support table: https://www.alpinelinux.org/releases/
- Docker Official Image metadata for Go: https://hub.docker.com/_/golang
- Docker Official Image metadata for Node.js: https://hub.docker.com/_/node
- Docker Official Image metadata for Python: https://hub.docker.com/_/python
- Docker Official Image metadata for Rust: https://hub.docker.com/_/rust
- Docker Official Image metadata for Fedora: https://hub.docker.com/_/fedora
- PyPI requests package release metadata: https://pypi.org/project/requests/

## Issues Found
- The post used `alpine:3.19`, which is no longer a current supported Alpine branch. Updated examples to `alpine:3.23`.
- The post used older language image tags: `golang:1.22`, `node:20`, and `rust:1.77`. Updated the examples and compatibility list to current supported tags (`golang:1.26`, `node:24`, and `rust:1.94`) based on current official image metadata and release schedules.
- The compatibility list used `fedora:39`, which is no longer a current Fedora image tag. Updated it to `fedora:44`.
- The Go multi-stage Containerfile referenced `$BUILDPLATFORM` in `FROM` without declaring it. Added `ARG BUILDPLATFORM` before the first `FROM` so the Podman/Buildah Containerfile platform argument is available.
- The Go build comment said the final stage was emulated. The final stage has no `RUN` instruction, so no emulated command runs during that stage. Reworded the comment to say the build produces an s390x target image.
- The Python example pinned `requests==2.31.0`, which is outdated. Updated it to `requests==2.32.5`.
- The binary architecture test used `file /usr/local/bin/app` inside an Alpine-based runtime image, but Alpine does not include `file` by default. Changed the test command to install `file` in the disposable test container before running it.

## Review Notes
Podman was not installed in the local workspace, so CLI behavior was verified against official Podman, Buildah, and Containerfile documentation plus live registry metadata where available. Docker Hub manifest queries were partly rate-limited, so official image pages and search-indexed Docker Hub metadata were used for the remaining base-image architecture checks.
