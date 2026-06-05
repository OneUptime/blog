# Validation Summary: How to Choose Between Kaniko and Docker Build in CI/CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Docker BuildKit and Buildx
- Docker-in-Docker
- Kaniko
- GitHub Actions
- GitLab CI/CD
- Kubernetes Jobs and Pod security contexts
- Container registry authentication and build caching

## Sources Consulted
- Docker Docs: Docker Build GitHub Actions - https://docs.docker.com/build/ci/github-actions/
- Docker Docs: Cache management with GitHub Actions - https://docs.docker.com/build/ci/github-actions/cache/
- Docker Docs: `docker buildx build` CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- GitLab Docs: Use Docker to build Docker images - https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab Docs: Build Docker images with BuildKit - https://docs.gitlab.com/ci/docker/using_buildkit/
- Kaniko README, archived GoogleContainerTools repository - https://github.com/GoogleContainerTools/kaniko/blob/main/README.md
- Kaniko releases, archived GoogleContainerTools repository - https://github.com/GoogleContainerTools/kaniko/releases
- Kubernetes Docs: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Docs: Secrets / Docker config Secrets - https://kubernetes.io/docs/concepts/configuration/secret/
- Local Docker CLI help for `docker buildx build`

## Issues Found
- Kaniko was described as one of two dominant current solutions and as Google's Kaniko. Updated the wording to note that the upstream Kaniko repository was archived on June 3, 2025 and is no longer actively maintained.
- GitHub Actions examples used older Docker action major versions. Updated `docker/login-action` to `v4`, `docker/setup-buildx-action` to `v4`, and `docker/build-push-action` to `v7` to match current Docker documentation.
- The GitLab DinD example used broad `docker:24.0` tags and `docker login -p`. Updated the image tags to pinned `docker:24.0.5-cli` / `docker:24.0.5-dind` examples and changed login to `--password-stdin`.
- Kaniko examples used `v1.22.0`. Updated them to `v1.23.2`, the latest release shown by the archived upstream release page.
- The Kubernetes security snippet claimed Kaniko works with Restricted policies while setting `runAsNonRoot: false`. Corrected the comment to say the example avoids privileged mode and socket mounting but is not compatible with Kubernetes Restricted Pod Security as-is.
- The post claimed Docker build is 20-40% faster for most workloads. Replaced the unsupported fixed range with a more accurate statement that BuildKit is often faster for cache-heavy workloads.
- The feature table overstated Kaniko's limitations and represented `--build-arg` as a secret mechanism. Corrected Kaniko caching, secret, and platform support details.
- The multi-platform example said multi-platform builds are only possible with Docker buildx. Corrected the comment to focus on Buildx's one-command manifest-list build, since Kaniko can build one target platform per build and manifest lists can be assembled separately.
- The Kaniko recommendation did not mention current rootless BuildKit guidance. Added a short caveat that new daemonless, non-privileged pipelines should consider rootless BuildKit first.

## Review Notes
Kaniko remains technically usable for existing pipelines, but because the upstream project is archived, future versions of this post should consider comparing Docker Buildx, rootless BuildKit, Buildah, and other maintained daemonless builders rather than presenting Kaniko as the primary current alternative.
