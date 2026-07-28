# Validation Summary: How to Test CI Pipeline Changes Locally Without Commit-Push-Wait Loops

## Status
validated

## Post Type
Technical guide / Best-practices guide

## Technologies Covered
- GitHub Actions workflow syntax, events, contexts, permissions, reusable workflows, artifacts, caches, concurrency, environments, and OIDC
- `act` local GitHub Actions emulator
- GitLab CI/CD, CI Lint, pipeline editor, and GitLab Runner
- Docker and BuildKit
- YAML
- Bash / POSIX-style shell commands

## Sources Consulted
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub Actions contexts reference](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts)
- [GitHub Actions events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [GitHub Actions reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)
- [GitHub Actions secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub Actions dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [GitHub Actions workflow artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts)
- [GitHub Actions workflow and job concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [GitHub Actions deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
- [GitHub Actions OpenID Connect](https://docs.github.com/en/actions/concepts/security/openid-connect)
- [GitLab CI/CD configuration validation](https://docs.gitlab.com/ci/yaml/lint/)
- [GitLab pipeline editor](https://docs.gitlab.com/ci/pipeline_editor/)
- [GitLab Runner commands](https://docs.gitlab.com/runner/commands/)
- [`act` usage guide](https://nektosact.com/usage/index.html)
- [`act` runner image documentation](https://nektosact.com/usage/runners.html)
- [`act` unsupported functionality](https://nektosact.com/not_supported.html)
- [Docker build command reference](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Docker run command reference](https://docs.docker.com/reference/cli/docker/container/run/)
- [Docker build cache invalidation](https://docs.docker.com/build/cache/invalidation/)
- [Docker build best practices](https://docs.docker.com/build/building/best-practices/)

## Issues Found
1. The manual canary guidance did not state GitHub's default-branch prerequisite for `workflow_dispatch`. GitHub only receives this event when the workflow file is present on the default branch. The text now scopes the example to a workflow that already supports `workflow_dispatch` on the default branch.
2. The event-fixture guidance said to assert permissions with a local module or emulator. `act` currently ignores `job.permissions`, so it cannot validate the effective provider permissions. The text now limits the local assertion to selected jobs and requires effective permissions to be verified remotely.

## Review Notes
- The `act pull_request -j unit` command is valid: the event is a positional argument and `-j` selects a job. Synthetic event payloads can be supplied with `-e`.
- `act` is intentionally an approximation. Its artifact server is not enabled automatically, and features including concurrency, job permissions, job timeouts, deployment-environment secret scoping, cancellation, and OIDC remain unsupported or incomplete. The post correctly assigns these provider-specific behaviors to remote validation.
- GitLab CI Lint currently checks syntax and logic, processes included configuration, and can simulate pipeline creation to identify `rules` and `needs` problems. Current GitLab Runner command documentation does not include the removed `gitlab-runner exec` workflow.
- The Docker `build` and `run` examples were confirmed against both current Docker documentation and the locally installed Docker CLI. The `-t`, `-f`, `--rm`, and `-e` options are valid, and the warning about mutable image tags and local caches is accurate.
- All external links in the post returned HTTP 200 after redirects on 2026-07-28.
