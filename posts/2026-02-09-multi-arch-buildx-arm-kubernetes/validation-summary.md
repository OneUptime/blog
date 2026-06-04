# Validation Summary: How to Build Multi-Architecture Container Images Using Docker Buildx

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Docker Buildx and BuildKit
- Docker multi-platform images and image indexes
- QEMU/binfmt emulation
- Go, Rust, Node.js, and Python container builds
- GitHub Actions and GitLab CI
- Kubernetes Deployments, Jobs, node selectors, and affinity

## Sources Consulted
- Docker Docs: Multi-platform builds - https://docs.docker.com/build/building/multi-platform/
- Docker Docs: Build variables and predefined platform arguments - https://docs.docker.com/build/building/variables/
- Docker Docs: docker buildx build CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: docker buildx imagetools inspect - https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- Docker Docs: GitHub Actions multi-platform image builds - https://docs.docker.com/build/ci/github-actions/multi-platform/
- Docker GitHub Actions repositories: build-push-action, setup-buildx-action, setup-qemu-action, login-action, metadata-action
- Kubernetes Docs: Images and multi-architecture image indexes - https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes Docs: Node labels populated by kubelet - https://kubernetes.io/docs/reference/node/node-labels/
- pip documentation: pip install options - https://pip.pypa.io/en/stable/cli/pip_install/
- npm documentation: npm ci - https://docs.npmjs.com/cli/commands/npm-ci/
- Node.js Docs: release schedule and end-of-life status - https://nodejs.org/en/about/eol
- Alpine Linux release branches - https://www.alpinelinux.org/releases/
- Go release policy - https://go.dev/doc/devel/release

## Issues Found
- The QEMU setup used `multiarch/qemu-user-static`, while Docker's current documented manual setup uses `tonistiigi/binfmt --install all`. Updated setup and troubleshooting commands.
- Several examples used outdated base images: `golang:1.21-alpine`, `alpine:3.18`, `rust:1.75`, and `node:18-alpine`. Updated them to currently supported examples.
- The Rust cross-compilation example installed Rust targets but no target linker/toolchain, so non-native builds would fail for typical GNU targets. Added Debian cross compiler packages and target-specific linker configuration.
- The Node.js build example used `--platform=$BUILDPLATFORM` while copying `node_modules` into target-platform runtime images. Updated the general Node example to build per target platform and switched from deprecated `npm ci --only=production` usage to `npm ci --omit=dev`.
- The GitHub Actions workflow used older major versions of Docker actions and `actions/checkout`. Updated to the current major versions shown in official Docker action documentation.
- The GitLab CI example still used the old QEMU helper image and Docker 24 images. Updated it to use `tonistiigi/binfmt` and Docker 29 image tags.
- The Kubernetes deployment comment said Kubernetes selects the image variant. Tightened this to say the container runtime pulls the variant matching the node architecture.
- The manifest inspection example assumed only Docker manifest-list media types. Updated it to show OCI image index media types and note Docker manifest-list media types as an alternative.
- The architecture-specific Node dependency example used `npm install`, which can mutate dependency resolution in CI-oriented Docker builds. Updated it to `npm ci --omit=dev` with platform and architecture config.
- The Python platform-specific wheel example used `pip install --platform` without a target directory and copied from global `site-packages`. Updated it to install into `/deps` with `--target` and copy that directory into the runtime image.

## Review Notes
The examples are now technically consistent with current Docker Buildx behavior and supported platform/version references as of 2026-06-04. Rust and Python cross-platform dependency builds can still require additional package-specific system libraries depending on the application, so real projects should test each target architecture in CI.
