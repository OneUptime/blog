# Validation Summary: How to Create GitLab CI Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml`)
- GitLab Runners
- Node.js (npm, npm ci)
- Docker (docker:24, docker:24-dind)
- Docker Buildx (multi-platform builds)
- PostgreSQL, Redis (as GitLab CI services)
- Trivy (container scanning)
- GitLab Container Registry
- Cobertura / JUnit reporting
- GitLab Environments / Review Apps

## Sources Consulted
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ee/ci/yaml/
- GitLab predefined CI/CD variables: https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
- GitLab `rules` documentation: https://docs.gitlab.com/ee/ci/yaml/#rules
- GitLab caching dependencies: https://docs.gitlab.com/ee/ci/caching/
- GitLab job artifacts: https://docs.gitlab.com/ee/ci/yaml/#artifacts
- GitLab services: https://docs.gitlab.com/ee/ci/services/
- GitLab `extends` and templates: https://docs.gitlab.com/ee/ci/yaml/#extends
- GitLab environments and deployments: https://docs.gitlab.com/ee/ci/environments/
- GitLab Container Registry auth: https://docs.gitlab.com/ee/user/packages/container_registry/
- GitLab Docker-in-Docker / TLS: https://docs.gitlab.com/ee/ci/docker/using_docker_build.html
- GitLab Interactive Web Terminals: https://docs.gitlab.com/ee/ci/interactive_web_terminal/
- Docker Buildx: https://docs.docker.com/buildx/working-with-buildx/
- Trivy install script: https://aquasecurity.github.io/trivy/

## Issues Found
- **Misleading claim about "SSH into failed jobs"**: The post stated "You can also SSH into failed jobs using GitLab's debug mode." GitLab does not provide SSH access into failed jobs. It supports Interactive Web Terminals for *running* jobs only (configured at the runner level), not failed jobs, and there is no "debug mode" feature with that behavior. Additionally, the example below that sentence demonstrated `after_script` and `CI_JOB_STATUS`, which is unrelated to SSH/interactive access. I rewrote the intro sentence and comment to accurately describe what `after_script` does (runs regardless of job outcome, useful for collecting diagnostics).

## Review Notes
- All YAML keyword usages (`stages`, `image`, `script`, `services`, `variables`, `cache`, `artifacts`, `rules`, `extends`, `needs`, `environment`, `before_script`, `after_script`, `coverage`, `allow_failure`) are valid GitLab CI syntax.
- Predefined variables (`CI_COMMIT_SHA`, `CI_COMMIT_SHORT_SHA`, `CI_COMMIT_BRANCH`, `CI_COMMIT_TAG`, `CI_PIPELINE_ID`, `CI_JOB_ID`, `CI_PROJECT_NAME`, `CI_REGISTRY_IMAGE`, `CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD`, `CI_REGISTRY`, `CI_MERGE_REQUEST_IID`, `CI_MERGE_REQUEST_TITLE`, `CI_PIPELINE_SOURCE`, `CI_COMMIT_REF_SLUG`, `CI_JOB_STATUS`, `CI_PROJECT_DIR`) are all valid and used correctly.
- `CI_COMMIT_SHORT_SHA` is documented as the first 8 characters of the commit SHA — matches the post's description.
- Cache policies `pull-push`, `pull`, and `push` are valid; `cache.key.files` for content-based keys is correct.
- Coverage report config (`coverage_format: cobertura` under `artifacts.reports.coverage_report`) is current syntax.
- `services` with `name` and `alias` is correct; the alias becomes the hostname inside the job container.
- `extends` accepts a list of templates for multiple inheritance, with later templates taking precedence — matches the post.
- `needs` for cross-stage dependencies and the dependent-graph (DAG) feature is correctly demonstrated.
- Review Apps using `environment.on_stop` + a paired job with `environment.action: stop` is the documented pattern.
- DinD setup with `DOCKER_TLS_CERTDIR: "/certs"` is the recommended modern configuration.
- Trivy install via the Aqua Security install script is a documented installation path.
- `CI_PIPELINE_SOURCE` values `"merge_request_event"` and `"schedule"` are valid.
- Minor nit (not changed): The Quick Reference says `policy: pull-push/pull/push` — `push`-only policy exists but is rarely used and conceptually a bit unusual; the post's prior examples only show `pull-push` and `pull`, which is fine.
- Minor nit (not changed): `set -e` is described as "fail fast" in the troubleshooting table; technically it makes the shell exit on the first error, which is the colloquial meaning of "fail fast" here, so acceptable.
