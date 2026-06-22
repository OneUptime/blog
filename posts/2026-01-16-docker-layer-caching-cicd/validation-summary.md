# Validation Summary: How to Use Docker Layer Caching in CI/CD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker
- Docker BuildKit
- Docker Buildx
- Dockerfile cache mounts
- Registry, inline, local, and GitHub Actions cache backends
- GitHub Actions
- GitLab CI
- Kaniko
- Jenkins Pipeline
- CircleCI
- Node.js, npm, Python/pip, Go modules, Maven, and Rust/Cargo

## Sources Consulted
- Docker Docs: Build cache backends - https://docs.docker.com/build/cache/backends/
- Docker Docs: Inline cache backend - https://docs.docker.com/build/cache/backends/inline/
- Docker Docs: Registry cache backend - https://docs.docker.com/build/cache/backends/registry/
- Docker Docs: GitHub Actions cache backend - https://docs.docker.com/build/cache/backends/gha/
- Docker Docs: Optimize cache usage in builds - https://docs.docker.com/build/cache/optimize/
- Docker Docs: Dockerfile reference for `RUN --mount=type=cache` - https://docs.docker.com/reference/dockerfile/
- Docker Docs: `docker buildx build` CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: GitHub Actions cache management - https://docs.docker.com/build/ci/github-actions/cache/
- Docker Docs: GitHub Actions tag and label management - https://docs.docker.com/build/ci/github-actions/manage-tags-labels/
- GitHub Docs: contexts reference for `github.ref_name` - https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub `actions/checkout` documentation - https://github.com/actions/checkout
- GitHub `actions/cache` documentation - https://github.com/actions/cache
- Docker `build-push-action` documentation - https://github.com/docker/build-push-action
- GitLab Docs: Docker layer caching in Docker-in-Docker builds - https://docs.gitlab.com/ci/docker/docker_layer_caching/
- GitLab Docs: Build Docker images with BuildKit - https://docs.gitlab.com/ci/docker/using_buildkit/
- Kaniko executor documentation - https://github.com/GoogleContainerTools/kaniko
- CircleCI Docs: Run Docker commands - https://circleci.com/docs/guides/execution-managed/building-docker-images/
- CircleCI Docs: Docker layer caching overview - https://circleci.com/docs/guides/optimize/docker-layer-caching/
- Node.js official release information - https://nodejs.org/en/about/previous-releases
- Go official release information - https://go.dev/doc/devel/release
- Python version status - https://devguide.python.org/versions/
- Rust official Docker image documentation - https://hub.docker.com/_/rust

## Issues Found
- The Node examples used `node:20`, which is EOL by the review date. Updated the examples to `node:24`, and used `node:24-alpine` consistently in multi-stage builds.
- The Node multi-stage examples built dependencies on the Debian-based `node:20` image and copied `node_modules` into an Alpine runtime. This can break native npm dependencies because Alpine uses musl libc. Updated the dependency, builder, and runtime stages to use the same Alpine base family.
- The cache diagram said the `npm ci` layer was cached if only `package.json` was unchanged, but the examples copy `package*.json`, including lockfiles. Updated the label to refer to package files.
- The inline cache example used older `BUILDKIT_INLINE_CACHE` syntax and an ambiguous local image reference while describing registry cache reuse. Updated it to the current `docker buildx build --cache-to type=inline --push` and `--cache-from type=registry,ref=...` pattern.
- The external registry cache example used `docker build` with `--cache-to`. Updated it to `docker buildx build --push` and used a fully qualified registry example.
- The GitHub Actions GHCR example was missing `packages: write` permissions for pushing with `GITHUB_TOKEN`. Added `permissions` with `contents: read` and `packages: write`.
- The GitLab CI Docker example pushed to the GitLab registry without logging in and had a multi-line command that would not execute as intended. Added `docker login` and shell line continuations.
- The Kaniko GitLab example pushed to the GitLab registry without writing Docker auth config and had a multi-line command that would not execute as intended. Added `/kaniko/.docker/config.json` setup and shell line continuations.
- The Jenkins local cache volume example ran Docker inside a Docker agent without access to a Docker daemon. Added the Docker socket mount alongside the cache volume.
- The CircleCI registry login example used `docker login -p`, which Docker warns against because it exposes the password on the command line. Updated it to use `--password-stdin`.
- The branch-based registry cache example used `${{ github.ref_name }}` directly in a Docker tag. Branch names can contain `/`, which is not valid in Docker tag names. Added a step that sanitizes slashes before using the value in registry cache references.
- The Go and Rust package-manager cache examples used old image tags. Updated Go to `golang:1.26` and Rust to `rust:latest` to avoid presenting outdated toolchain versions as current examples.

## Review Notes
The remaining examples are intentionally generic and may still require project-specific registry credentials, Docker daemon access, or native dependency build packages. The `actions/cache` local Buildx cache pattern is still usable, but Docker's `type=gha` backend is usually simpler for GitHub Actions workflows.
