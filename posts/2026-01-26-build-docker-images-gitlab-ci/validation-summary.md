# Validation Summary: How to Build Docker Images with GitLab CI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitLab CI/CD
- Docker and Docker-in-Docker
- GitLab Container Registry
- BuildKit and Docker Buildx
- Multi-stage Docker builds
- Multi-platform container builds
- Docker build cache
- Trivy image scanning
- Dockerfile build secrets

## Sources Consulted
- GitLab Docs: Use Docker to build Docker images - https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab Docs: Build Docker images with BuildKit - https://docs.gitlab.com/ci/docker/using_buildkit/
- GitLab Docs: Use kaniko to build Docker images (removed) - https://docs.gitlab.com/ci/docker/using_kaniko/
- GitLab Docs: Cache Docker layers in Docker-in-Docker builds - https://docs.gitlab.com/ci/docker/docker_layer_caching/
- GitLab Docs: Authenticate with the container registry - https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ci/yaml/
- Docker Docs: Docker Buildx build reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Multi-platform builds - https://docs.docker.com/build/building/multi-platform/
- Docker Docs: Build cache backends - https://docs.docker.com/build/cache/backends/
- Trivy Docs: Container image scanning CLI reference - https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/

## Issues Found
- The post recommended Kaniko for rootless GitLab CI builds. GitLab's Kaniko documentation has been removed because Kaniko is no longer maintained, and GitLab now recommends Docker, BuildKit, Buildah, or Podman alternatives. I replaced the Kaniko section with the official rootless BuildKit pattern using `moby/buildkit:rootless`, `BUILDKITD_FLAGS`, Docker auth config, and `buildctl-daemonless.sh`.
- The post description and conclusion still listed Kaniko as a recommended approach. I updated those references to rootless BuildKit and Buildx so the guidance matches current GitLab documentation.
- The security scanning pipeline used Docker commands in `build-image` and `push-image` without defining a Docker image, DinD service, or DinD connection variables. I added the required Docker image, `docker:dind` service, `DOCKER_HOST`, and `DOCKER_TLS_CERTDIR` settings to those jobs.
- The `push-image` job combined `dependencies` with `needs`, which GitLab advises against, and it did not explicitly request the `image.tar` artifact through `needs`. I changed it to use `needs:artifacts` for `build-image` and a normal need on `scan-image`.
- The BuildKit secret-mount Dockerfile example omitted the Dockerfile syntax directive. I added `# syntax=docker/dockerfile:1` so `RUN --mount=type=secret` is reliably interpreted by the BuildKit Dockerfile frontend.

## Review Notes
- All YAML snippets were parsed locally after edits.
- The Docker and Buildx flags used in the post, including `--cache-from`, `--cache-to`, `--platform`, `--target`, and `--secret`, match current Docker CLI documentation.
- Several examples still use `docker login -p`, which is valid but less secure than `--password-stdin`. Future revisions could switch all login examples to GitLab's recommended `echo "$CI_REGISTRY_PASSWORD" | docker login ... --password-stdin` form.
