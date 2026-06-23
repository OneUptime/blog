# Validation Summary: How to Set Up Docker-in-Docker in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml`)
- Docker / Docker-in-Docker (`docker:24`, `docker:24-dind`)
- Docker BuildKit and registry caching
- Docker Compose (v2)
- GitLab Container Registry
- Kaniko (`gcr.io/kaniko-project/executor`)
- Buildah (`quay.io/buildah/stable`)
- Trivy (`aquasec/trivy`)

## Sources Consulted
- GitLab Docs — Use Docker to build Docker images: https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab Docs — Authenticate with the registry in Docker-in-Docker: https://docs.gitlab.com/ci/docker/authenticate_registry/
- GitLab Blog — Changes to GitLab CI/CD and Docker-in-Docker with Docker 19.03 (TLS by default): https://about.gitlab.com/blog/docker-in-docker-with-docker-19-dot-03/
- GitLab Docs — Troubleshooting Docker build: https://docs.gitlab.com/ci/docker/docker_build_troubleshooting/
- Docker Hub — `docker` (dind) image documentation / TLS defaults
- Kaniko project README (executor flags: `--context`, `--dockerfile`, `--destination`, `--cache`, `--cache-repo`)
- Buildah documentation (`buildah bud`, `STORAGE_DRIVER`, `BUILDAH_FORMAT`)

## Issues Found
1. **Missing `DOCKER_TLS_CERTDIR: ""` when using non-TLS port 2375 (Multi-Stage Builds example).**
   Since Docker 19.03, `docker:dind` enables TLS by default (the image sets `DOCKER_TLS_CERTDIR=/certs`, so the daemon listens on port 2376 with TLS). Connecting to `tcp://docker:2375` without explicitly setting `DOCKER_TLS_CERTDIR: ""` fails with "Cannot connect to the Docker daemon at tcp://docker:2375." Added `DOCKER_TLS_CERTDIR: ""` to the job's `variables`.

2. **Same issue in the Caching Docker Builds example.** Added `DOCKER_TLS_CERTDIR: ""`.

3. **Same issue in the Security Scanning section** — both the `build` and `scan` jobs used `tcp://docker:2375` without disabling TLS. Added `DOCKER_TLS_CERTDIR: ""` to both jobs.

4. **`deploy` job in the "Building and Pushing Images" example was missing registry authentication.** The job pulls from and pushes to the private GitLab Container Registry (`$CI_REGISTRY_IMAGE`), which requires authentication, but had no `docker login`. Since each GitLab job runs in a fresh container, the login performed in the `build` job does not carry over. Added a `before_script` with `docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY` to match the pattern used by the `build` job in the same example.

## Review Notes
- The default-TLS examples (Secure DinD with TLS, the Complete DinD Pipeline) correctly use port 2376 with `DOCKER_TLS_CERTDIR: "/certs"`, `DOCKER_TLS_VERIFY`, and `DOCKER_CERT_PATH`. These match GitLab's recommended TLS configuration.
- The Trivy scan that mounts `-v /var/run/docker.sock:/var/run/docker.sock` is correct under DinD: the `docker run` is executed by the DinD daemon, so the volume path resolves inside the DinD container where the socket actually exists.
- The single-concept snippets (Basic DinD's `docker push myapp`, the Multi-Stage Builds `build` job, the Security Scanning `build`/`scan` jobs) are simplified fragments that push/pull without a `docker login` step. They illustrate one feature at a time and rely on the reader adding authentication shown elsewhere in the post; left as-is rather than expanding each snippet. Readers copying them for real private-registry use will need to add `docker login`.
- `docker-compose.test.yml` uses `version: '3.8'`. The top-level `version` key is obsolete/ignored under Docker Compose v2 (it emits a warning) but is harmless and still parses; left unchanged.
- The Kaniko example pins `v1.9.0-debug`, which is older than current releases but valid; flags are correct. Worth refreshing the tag in a future update.
- Image tags `docker:24` / `docker:24-dind` are valid; newer major versions exist but the pinned version keeps the examples reproducible.
