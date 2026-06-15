# Validation Summary: How to Debug Docker Multi-Platform Build Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Buildx
- Docker BuildKit
- Dockerfile multi-stage builds
- Docker multi-platform image manifests
- QEMU and binfmt_misc
- GitHub Actions Docker workflows
- npm native package installation
- Go cross-compilation
- Alpine, Debian, Node.js, Python, and Go container images

## Sources Consulted
- Docker Docs: Multi-platform builds - https://docs.docker.com/build/building/multi-platform/
- Docker Docs: docker buildx build reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: Multi-platform image with GitHub Actions - https://docs.docker.com/build/ci/github-actions/multi-platform/
- Docker Docs: Docker container builder driver - https://docs.docker.com/build/builders/drivers/docker-container/
- Docker setup-qemu-action README - https://github.com/docker/setup-qemu-action
- npm Docs: config - https://docs.npmjs.com/cli/v9/using-npm/config/
- Node.js releases - https://nodejs.org/en/about/previous-releases
- Go release history and release policy - https://go.dev/doc/devel/release
- Alpine Linux releases - https://www.alpinelinux.org/releases/
- Python Developer's Guide: Status of Python versions - https://devguide.python.org/versions/

## Issues Found
- The post described Docker as using BuildKit and QEMU for all multi-platform builds. Updated this to clarify that BuildKit handles multi-platform builds and QEMU is used when non-native binaries need emulation.
- The QEMU setup command used `multiarch/qemu-user-static`. Replaced it with Docker's documented `tonistiigi/binfmt --install all` command and added the documented `F` flag verification note.
- GitHub Actions examples used older Docker action major versions. Updated `setup-qemu-action`, `setup-buildx-action`, `login-action`, and `build-push-action` to the current major versions shown in Docker's documentation.
- Several example base images used EOL or stale tags, including Node 18, Node 20, Go 1.21, and Alpine 3.19. Updated examples to currently supported tags.
- The base-image manifest example implied `node:18-alpine` was both bad and good. Replaced that contradiction with a neutral instruction to inspect the actual tag being considered.
- The npm native-package examples used `TARGETPLATFORM##*/`, `npm_config_arch`, or `--target_arch`, which do not correctly map Docker's `amd64` value to npm's documented CPU value `x64`. Updated examples to use npm's `cpu` config through `npm_config_cpu` and map `amd64` to `x64`.
- The BuildKit log-limit example passed `BUILDKIT_STEP_LOG_MAX_SIZE` as a build argument. Updated it to configure the builder with `--driver-opt env.BUILDKIT_STEP_LOG_MAX_SIZE=...`, which is the correct scope for that setting.

## Review Notes
The remaining examples are intentionally generic. Node.js native module cross-architecture installs can still require package-specific build tools, libc compatibility, and available prebuilt binaries; the post now phrases that example around packages with prebuilt native binaries instead of presenting it as universal cross-compilation.
