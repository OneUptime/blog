# Validation Summary: How to Build Docker Images with Cache Busting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker build cache and Dockerfile layer caching
- Docker BuildKit and cache mounts
- Docker CLI / Buildx commands
- Node.js npm installs in Docker
- Python, Go, and Ruby dependency installation examples
- GitHub Actions and GitLab CI Docker build workflows

## Sources Consulted
- Docker Docs: Build cache invalidation - https://docs.docker.com/build/cache/invalidation/
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Build variables - https://docs.docker.com/build/building/variables/
- Docker Docs: Building best practices - https://docs.docker.com/build/building/best-practices/
- Docker Docs: Optimize cache usage in builds - https://docs.docker.com/build/cache/optimize/
- Docker Docs: docker buildx build CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: docker buildx prune CLI reference - https://docs.docker.com/reference/cli/docker/buildx/prune/
- Docker Docs: docker builder prune CLI reference - https://docs.docker.com/reference/cli/docker/builder/prune/
- GitHub Docs: Contexts reference - https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitLab Docs: Predefined CI/CD variables reference - https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab Docs: Where variables can be used - https://docs.gitlab.com/ci/variables/where_variables_can_be_used/
- Local Docker CLI help for `docker build`, `docker builder prune`, `docker buildx prune`, and `docker system prune`
- Local npm CLI help for `npm ci`

## Issues Found
- Several Dockerfile examples declared cache-busting `ARG` values without using them in an instruction. Docker's build-variable documentation states that build arguments have no effect unless used in an instruction, so changing those build args would not reliably invalidate the intended layers. Added small `RUN echo ...` instructions, or included the echo in an existing `RUN`, so the argument values participate in the cache key before the target layers.
- The `--no-cache` guidance implied that absolutely nothing would be cached. Docker documents that `--no-cache` disables layer cache reuse but does not pull a fresh base image by itself, so the wording now recommends adding `--pull` when a fresh base image is needed.
- The Node.js best-practice example used `npm ci --only=production`. Current npm documentation presents `--omit=dev` as the supported way to omit development dependencies, so the example was updated to `npm ci --omit=dev`.
- The BuildKit cache-mount section used `docker builder prune --filter type=exec.cachemount` for type-specific cache pruning. The documented CLI reference for cache-record type filters is `docker buildx prune`, so the BuildKit examples were updated to `docker buildx prune` and `docker buildx prune --filter type=exec.cachemount`.

## Review Notes
The examples are illustrative and assume the referenced project files exist, such as `package-lock.json`, `requirements.txt`, `go.mod`, `go.sum`, `Gemfile.lock`, and application entry points. `docker build --no-cache` disables build-cache reuse but does not by itself pull a newer base image; the post separately lists `docker build --pull` for that purpose.
