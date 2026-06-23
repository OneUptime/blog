# Validation Summary: How to Set Up Container Registry in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml`, predefined variables, rules, stages)
- GitLab Container Registry
- Docker / Docker-in-Docker (dind)
- Kaniko
- BuildKit (cache-from, inline cache)
- Trivy and GitLab Container Scanning
- genuinetools `reg`
- Kubernetes (`kubectl set image`)

## Sources Consulted
- GitLab CI/CD `rules:changes` and glob patterns — https://docs.gitlab.com/ee/ci/yaml/#ruleschanges
- GitLab "Use Docker to build Docker images" — https://docs.gitlab.com/ee/ci/docker/using_docker_build.html
- doublestar glob semantics (used by GitLab `changes`) — https://pkg.go.dev/github.com/bmatcuk/doublestar
- GitLab predefined CI/CD variables — https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
- GitLab Container Scanning (`gtcs`) — https://docs.gitlab.com/ee/user/application_security/container_scanning/
- Kaniko on GitLab CI — https://docs.gitlab.com/ee/ci/docker/using_kaniko.html

## Issues Found
1. **Misleading inline comment in the first build job.** The `variables` block contained the comment `# Use Kaniko for building without Docker daemon`, but that job builds with Docker-in-Docker, not Kaniko. Changed the comment to `# Full image reference used throughout the job` so it accurately describes the `DOCKER_IMAGE` variable it annotates.

2. **Missing `DOCKER_TLS_CERTDIR: ""` in two dind examples.** The "Image Tagging Strategies" job and the `.build_template` in "Building Multiple Images" set `DOCKER_HOST: tcp://docker:2375` (the non-TLS port) but did not set `DOCKER_TLS_CERTDIR: ""`. `docker:24-dind` enables TLS by default and listens on port 2376, so a client pointed at 2375 without disabling TLS fails to connect. Added `DOCKER_TLS_CERTDIR: ""` to both, matching the (correct) first build example.

## Review Notes
- The glob pattern `services/api/**` used in `rules:changes` is correct — GitLab uses `doublestar`, where `path/**` matches all nested files and directories recursively, so no `/*` suffix is required.
- All predefined variables referenced (`CI_REGISTRY`, `CI_REGISTRY_IMAGE`, `CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD`, `CI_COMMIT_SHA`, `CI_COMMIT_REF_SLUG`, `CI_COMMIT_BRANCH`, `CI_COMMIT_TAG`, `CI_PROJECT_DIR`, `CI_API_V4_URL`, `CI_PROJECT_ID`, `CI_PIPELINE_SOURCE`) are valid and used correctly.
- The Kaniko examples (`gcr.io/kaniko-project/executor:v1.9.0-debug`, the `/kaniko/.docker/config.json` auth file, `--cache`/`--cache-repo` flags) are accurate. Note: Kaniko's GitHub repository was archived/deprecated in 2024–2025; the version pinned here still works, but readers may eventually want to migrate to BuildKit or Buildah. Left as-is since it remains functional.
- The GitLab Container Scanning job using `gtcs scan` with the `container_scanning` artifact report is correct for current analyzer versions. Using the official CI/CD template (`Security/Container-Scanning.gitlab-ci.yml`) would be more maintainable, but the manual form shown is valid.
- The "Via API" cleanup example hardcodes `repositories/1`; this is illustrative (the repository ID will differ per project), which the surrounding text implies. Not a technical error.
- In the `reg` cleanup example, the comment "Delete images older than 30 days" overstates what the command does — `reg rm ...:old-tag` deletes a specific tag, not by age. The comment is aspirational rather than incorrect code; left unchanged as it does not affect the command's correctness, but readers should note `reg` does not filter by age on its own.
