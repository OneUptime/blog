# Validation Summary: How to Store Terraform State in GitLab Managed State

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform HTTP backend
- GitLab managed Terraform/OpenTofu state
- GitLab CI/CD
- GitLab CI job token authentication
- GitLab Terraform/OpenTofu report artifacts
- GitLab Terraform state API

## Sources Consulted
- GitLab Docs: GitLab-managed Terraform/OpenTofu state - https://docs.gitlab.com/user/infrastructure/iac/terraform_state/
- GitLab Docs: Troubleshooting the Terraform integration with GitLab - https://docs.gitlab.com/user/infrastructure/iac/troubleshooting/
- GitLab Docs: OpenTofu integration in merge requests - https://docs.gitlab.com/user/infrastructure/iac/mr_integration/
- GitLab Docs: CI/CD artifacts reports types - https://docs.gitlab.com/ci/yaml/artifacts_reports/
- GitLab Docs: Job artifacts and CI/CD YAML artifact paths - https://docs.gitlab.com/ci/jobs/job_artifacts/ and https://docs.gitlab.com/ee/ci/yaml/
- GitLab Docs: Terraform state administration and settings - https://docs.gitlab.com/administration/terraform_state/ and https://docs.gitlab.com/administration/settings/terraform_state_settings/
- GitLab Docs: GitLab application limits - https://docs.gitlab.com/administration/instance_limits/
- HashiCorp Developer Docs: Terraform HTTP backend - https://developer.hashicorp.com/terraform/language/backend/http

## Issues Found
- The GitLab CI examples used multiline `terraform init` commands that were not valid YAML script commands. I changed the examples to set the HTTP backend values through `TF_HTTP_*` environment variables and run `terraform init` as a single command.
- The CI examples passed `CI_JOB_TOKEN` through `-backend-config`. GitLab documents that backend config values can be persisted into the plan cache, and a job token from the plan job can break state locking in a later apply job. I changed the examples to use Terraform HTTP backend environment variables instead.
- The merge request plan report examples wrote raw `terraform show -json` output to `reports:terraform`. GitLab expects a Terraform/OpenTofu report JSON summary with create/update/delete counts, generated with `jq`. I updated the examples to produce the expected report format and added `jq` installation to the full pipeline.
- The pipeline used `TF_ROOT: ${CI_PROJECT_DIR}/terraform` while artifact paths are required to be relative to the project directory. I changed `TF_ROOT` to `terraform`.
- The text said the GitLab UI path was Infrastructure > Terraform states. Current GitLab documentation uses Operate > Terraform states, so I updated the navigation.
- The text said state files larger than about 5 MB may see performance issues. I could not verify that fixed threshold in current official documentation. I replaced it with the documented behavior: self-managed GitLab administrators can configure maximum Terraform state file size, and platform API limits also apply.
- The CI job token permission explanation was too broad. I clarified that the triggering user still needs the required GitLab project permissions: Developer or higher for read access, and Maintainer or Owner for lock, unlock, and write operations.

## Review Notes
The YAML snippets were parsed successfully after the fixes. Terraform CLI was not installed in the workspace, so Terraform command behavior and backend settings were verified against HashiCorp and GitLab official documentation rather than local CLI execution.
