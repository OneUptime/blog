# Validation Summary: How to Use GitLab CI with Dapr Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml` pipeline configuration)
- Dapr (Distributed Application Runtime) CLI and sidecar
- Docker / Docker-in-Docker for image builds
- Trivy (container image scanning)
- Checkov (Kubernetes manifest scanning)
- kubectl (Kubernetes deployments)
- pytest (Python test runner)
- Redis (used as a Dapr component backing store)

## Sources Consulted
- Dapr CLI reference for `dapr init` and `dapr run` flags: https://docs.dapr.io/reference/cli/
- Dapr CLI `--slim` mode documentation: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-no-docker/
- Dapr CLI install script source: https://github.com/dapr/cli (default branch: `master`)
- GitLab CI/CD `image` and `entrypoint` documentation: https://docs.gitlab.com/ee/ci/docker/using_docker_images.html
- GitLab CI/CD predefined variables (`CI_REGISTRY_IMAGE`, `CI_COMMIT_SHA`, etc.): https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
- Checkov GitLab CI integration guide: https://www.checkov.io/2.Basics/Integrating%20with%20CI.html
- Trivy CI integration patterns: https://aquasecurity.github.io/trivy/latest/docs/advanced/integrations/gitlab-ci/
- kubectl CLI reference for `set image` and `rollout status`: https://kubernetes.io/docs/reference/kubectl/

## Issues Found

### 1. `dapr init` missing `--slim` flag (line 54)
**What was wrong:** The `dapr-integration-test` job runs on `image: ubuntu:22.04` without Docker-in-Docker. The command `dapr init --runtime-version $DAPR_VERSION` attempts to pull and run Docker containers (Redis, Zipkin, placement service), which requires a running Docker daemon. This would fail in the CI environment.

**What was changed:** Changed `dapr init --runtime-version $DAPR_VERSION` to `dapr init --slim --runtime-version $DAPR_VERSION`. The `--slim` flag installs only the Dapr CLI and sidecar binaries without starting Docker containers, which is the correct approach for CI environments without Docker. The job already provides Redis via GitLab CI `services` and custom component definitions via `--resources-path`.

### 2. Checkov image missing entrypoint override (line 103)
**What was wrong:** The `manifest-scan` job used `image: bridgecrew/checkov:latest` without overriding the entrypoint. The `bridgecrew/checkov` image has `ENTRYPOINT ["checkov"]`, which can interfere with GitLab CI script execution (particularly on older GitLab Runner versions). The Trivy job in the same post correctly overrides its entrypoint, making this an inconsistency.

**What was changed:** Changed the image specification from `image: bridgecrew/checkov:latest` to the extended form with `entrypoint: [""]`, matching the pattern used by the Trivy job and consistent with the official Checkov GitLab CI integration documentation.

## Review Notes
- The `integration-test` stage is defined in the stages list but no job in the post uses it. The `dapr-integration-test` job uses `stage: test`. This appears to be a placeholder for post-deployment integration tests that are not shown in the post.
- The `only/except` keywords used in the deploy jobs are the older GitLab CI syntax. GitLab now recommends `rules` for new pipelines, though `only/except` remains functional.
- `allow_failure: false` on the scan jobs is the default value and therefore redundant, though it does make the intent explicit.
- The Dapr CLI install URL (`https://raw.githubusercontent.com/dapr/cli/master/install/install.sh`) is correct; the Dapr CLI repo uses `master` as its default branch.
- The `--resources-path` flag on `dapr run` is correct for Dapr 1.13.0 (replaced the deprecated `--components-path` starting in Dapr 1.9).
