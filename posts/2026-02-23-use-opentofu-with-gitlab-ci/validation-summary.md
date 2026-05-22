# Validation Summary: How to Use OpenTofu with GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- GitLab CI/CD
- GitLab merge request OpenTofu reports
- GitLab-managed Terraform/OpenTofu state
- AWS OIDC authentication
- Azure and Google Cloud provider authentication variables
- Docker images for CI runners

## Sources Consulted
- GitLab Docs: CI/CD artifacts reports, `artifacts:reports:terraform` - https://docs.gitlab.com/ci/yaml/artifacts_reports/
- GitLab Docs: OpenTofu integration in merge requests - https://docs.gitlab.com/user/infrastructure/iac/mr_integration/
- GitLab Docs: GitLab-managed Terraform/OpenTofu state - https://docs.gitlab.com/user/infrastructure/iac/terraform_state/
- GitLab Docs: CI/CD YAML syntax reference, `id_tokens`, `image`, `before_script`, `cache`, `rules`, `artifacts` - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: Deprecated CI/CD YAML keywords - https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- GitLab Docs: Configure OpenID Connect in AWS - https://docs.gitlab.com/ci/cloud_services/aws/
- GitLab Docs: Protected environments - https://docs.gitlab.com/ci/environments/protected_environments/
- OpenTofu Docs: `tofu plan` command - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu Docs: `tofu show` command - https://opentofu.org/docs/cli/commands/show/
- OpenTofu Docs: `tofu apply` command - https://opentofu.org/docs/cli/commands/apply/
- OpenTofu Docs: GitHub Releases / standalone installation - https://opentofu.org/docs/intro/install/standalone/
- OpenTofu Docs: Docker image guidance - https://opentofu.org/docs/intro/install/docker/

## Issues Found
- The basic pipeline declared `artifacts:reports:terraform: ${TF_ROOT}/plan.json` but did not generate `plan.json`. I added a `tofu show -json plan.bin | jq ... > plan.json` step.
- The merge request report examples uploaded raw OpenTofu plan JSON. GitLab's documented manual report example expects a reduced JSON summary with `create`, `update`, and `delete` counts, so I changed the examples to generate that summary with `jq`.
- The snippets used globally defined `image`, `cache`, and `before_script`, which GitLab now marks as deprecated outside `default`. I moved the full-pipeline examples to `default`.
- The GitLab CI image examples used an image with a Docker entrypoint but did not override it. I added `entrypoint: [""]` so GitLab Runner can execute job scripts.
- The multi-environment plan jobs generated report JSON with `jq` but did not ensure `jq` was installed. I added `apk --no-cache add jq` to the shared OpenTofu initialization job.
- The backend HCL example used `${PROJECT_ID}` and `${STATE_NAME}` interpolation-like placeholders inside a backend block. Backend configuration cannot rely on normal Terraform/OpenTofu variable interpolation, so I changed them to literal placeholder values.
- The GitLab-managed backend CI snippet used global `before_script`. I moved it under `default`.
- The drift detection job captured `tofu plan -detailed-exitcode` after a command that can intentionally return `2`. In CI shells that stop on non-zero exits, this can fail before checking `$?`. I added `set +e` / `set -e` handling and explicit error handling for exit code `1`.
- The custom Docker image pinned OpenTofu `1.8.0`; current OpenTofu docs show `1.12.0` as the current release. I updated the Dockerfile argument to `1.12.0`.
- The custom Dockerfile ended with `ENTRYPOINT [""]`, which is not a valid way to provide a normal shell-compatible CI image. I removed it.

## Review Notes
- The examples still use the older `ghcr.io/opentofu/opentofu:1.8.0` image for the simple pipeline snippets. That can work with an entrypoint override, but OpenTofu's current Docker guidance recommends building a custom image for modern versions instead of using official images directly.
- OpenTofu plan files and JSON output can contain sensitive values. GitLab's official docs recommend restricting artifact access and project visibility when publishing plan artifacts.
