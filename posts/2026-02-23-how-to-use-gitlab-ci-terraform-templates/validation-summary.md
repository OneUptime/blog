# Validation Summary: How to Use GitLab CI Terraform Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab CI/CD templates and includes
- Terraform CLI
- Terraform HTTP backend
- GitLab-managed Terraform/OpenTofu state
- GitLab Terraform/OpenTofu merge request reports
- YAML

## Sources Consulted
- GitLab Docs: Infrastructure as Code with OpenTofu and GitLab - https://docs.gitlab.com/user/infrastructure/iac/
- GitLab Docs: Deprecate Terraform CI/CD templates - https://docs.gitlab.com/update/deprecations/#deprecate-terraform-cicd-templates
- GitLab Docs: GitLab-managed Terraform/OpenTofu state - https://docs.gitlab.com/user/infrastructure/iac/terraform_state/
- GitLab Docs: OpenTofu integration in merge requests - https://docs.gitlab.com/user/infrastructure/iac/mr_integration/
- GitLab Docs: CI/CD artifacts reports types - https://docs.gitlab.com/ci/yaml/artifacts_reports/
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ee/ci/yaml/
- GitLab 17.11 archived docs: GitLab Terraform helpers - https://archives.docs.gitlab.com/17.11/user/infrastructure/iac/gitlab_terraform_helpers/
- GitLab source: Terraform/Base.latest.gitlab-ci.yml historical template - https://gitlab.com/gitlab-org/gitlab/-/blob/5f271d7c589734eee45f6b4536f0970f1d0f47a0/lib/gitlab/ci/templates/Terraform/Base.latest.gitlab-ci.yml
- GitLab source: Terraform.gitlab-ci.yml historical template - https://gitlab.com/gitlab-org/gitlab/-/blob/3f9981d7988999716b42e299b6a8c4dd52dd171d/lib/gitlab/ci/templates/Terraform.gitlab-ci.yml
- Terraform Docs: CLI environment variables - https://developer.hashicorp.com/terraform/cli/config/environment-variables
- Terraform Docs: HTTP backend - https://developer.hashicorp.com/terraform/language/backend/http

## Issues Found
- The post presented GitLab Terraform CI/CD templates as current official templates. GitLab deprecated these templates in GitLab 16.9 and removed them in GitLab 18.0, so I updated the introduction, official-template sections, description, and conclusion to scope those examples to GitLab 17.x or copied/self-hosted templates.
- The customization snippet described `TF_INIT_FLAGS` as the Terraform version control variable and used a non-template `TF_PLAN_FLAGS` variable. I corrected the comment for `TF_INIT_FLAGS` and replaced `TF_PLAN_FLAGS` with Terraform's supported `TF_CLI_ARGS_plan`.
- The customization snippet used a `TF_IMAGE` variable to override the image, but the archived GitLab template defines the image directly rather than through that variable. I changed the example to use the GitLab CI `image:` keyword.
- The custom reusable template used `terraform init -backend-config=...` with `CI_JOB_TOKEN`. GitLab and Terraform documentation warn that backend config can be cached into plan files and forwarded to apply jobs, causing state lock/authentication problems. I changed the examples to use the HTTP backend environment variables instead.
- The custom template declared a Terraform report artifact at `plan.json` but never created `plan.json`. I added `terraform show -json` piped through the documented `jq` summary conversion so GitLab receives the expected report format.
- The custom template used shell-style default expansion in `environment:name`. GitLab CI variable expansion is not shell evaluation there, so I added a default `TF_ENVIRONMENT` variable and changed the environment name to `$TF_ENVIRONMENT`.
- The multi-environment template mixed `dependencies` and `needs` in the same jobs. GitLab documentation advises against combining them, so I replaced those with `needs` entries that explicitly request artifacts from the relevant plan jobs and order later environments after earlier applies.
- The multi-environment template relied on `TF_STATE_NAME` while the validate job had no default value. I added a default state name and kept environment-specific overrides on plan/apply jobs.
- One corrected YAML snippet needed a block scalar for the long `jq` command because an unquoted colon in the JSON expression made the YAML invalid. I fixed the snippet and verified all YAML code fences parse successfully.

## Review Notes
The custom examples remain Terraform-based, which is valid, but current GitLab documentation primarily recommends the OpenTofu CI/CD component for new GitLab-managed IaC pipelines. The post now flags the official Terraform templates as legacy instead of current.
