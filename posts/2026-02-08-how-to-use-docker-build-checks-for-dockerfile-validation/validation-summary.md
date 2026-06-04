# Validation Summary: How to Use Docker Build Checks for Dockerfile Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile
- Docker Buildx
- BuildKit
- Docker build checks
- Docker Compose
- GitHub Actions
- GitLab CI
- Hadolint
- Make

## Sources Consulted
- Docker Docs: Checking your build configuration - https://docs.docker.com/build/checks/
- Docker Docs: Build checks reference - https://docs.docker.com/reference/build-checks/
- Docker Docs: Dockerfile `check` parser directive - https://docs.docker.com/reference/dockerfile/#check
- Docker Docs: `docker buildx build --check` / `--call=check` - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: `docker compose build --check` - https://docs.docker.com/reference/cli/docker/compose/build/
- Docker Docs: `docker buildx bake --check` / `--call=check` - https://docs.docker.com/reference/cli/docker/buildx/bake/
- Docker Docs: LegacyKeyValueFormat - https://docs.docker.com/reference/build-checks/legacy-key-value-format/
- Docker Docs: SecretsUsedInArgOrEnv - https://docs.docker.com/reference/build-checks/secrets-used-in-arg-or-env/
- Docker Docs: JSONArgsRecommended - https://docs.docker.com/reference/build-checks/json-args-recommended/
- Docker Docs: FromPlatformFlagConstDisallowed - https://docs.docker.com/reference/build-checks/from-platform-flag-const-disallowed/
- Hadolint official site - https://hadolint.github.io/hadolint/
- Local Docker CLI help for `docker build --check` and `docker compose build --check`

## Issues Found
- Corrected the requirements from Docker Engine 27.0 / Docker Desktop 4.33 to the official Docker Buildx 0.15.0 and Dockerfile syntax 1.8 requirement, while keeping Docker Desktop 4.33 as a supported bundled release.
- Corrected the verification commands to check the Buildx version rather than looking for BuildKit v0.15.0.
- Corrected `docker build --check` exit behavior: official docs state that check violations make `--check` exit non-zero.
- Replaced the demonstration Dockerfile so it actually triggers the listed `SecretsUsedInArgOrEnv`, `LegacyKeyValueFormat`, and `JSONArgsRecommended` warnings.
- Removed the non-existent `RedundantUser` check and replaced it with a current built-in check example.
- Clarified build-check configuration through the `check` directive and `BUILDKIT_DOCKERFILE_CHECK` build argument, including Bake targets.
- Corrected the "Fixing Common Issues" example by removing the claim that Docker build checks enforce base image tag pinning, which is not a current built-in Docker build check.

## Review Notes
Docker build checks are currently documented as beta, and the available checks depend on the Dockerfile syntax version. The examples are accurate for current Docker Buildx releases, but future Dockerfile syntax releases may add or change checks.
