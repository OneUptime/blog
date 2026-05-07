# Validation Summary: How to Automate Packer Builds and OpenTofu Deploys in CI/CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitHub Actions
- AWS IAM OIDC federation for GitHub Actions
- AWS Systems Manager Parameter Store
- AWS CLI
- Packer
- OpenTofu
- Terraform AWS provider

## Sources Consulted
- GitHub Docs, "Workflow commands for GitHub Actions": https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Docs, "Passing information between jobs": https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/pass-job-outputs
- GitHub Docs, "Webhook events and payloads" (`push` event payload with `before`/`after`): https://docs.github.com/en/webhooks/webhook-events-and-payloads
- `actions/checkout` README: https://github.com/actions/checkout
- `aws-actions/configure-aws-credentials` README: https://github.com/aws-actions/configure-aws-credentials
- Packer manifest post-processor docs: https://developer.hashicorp.com/packer/docs/post-processors/manifest
- Packer `env` function docs: https://developer.hashicorp.com/packer/docs/templates/hcl_templates/functions/contextual/env
- OpenTofu CLI basics (`-chdir`): https://opentofu.org/docs/cli/commands/
- OpenTofu `apply` command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS CLI `put-parameter` reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/put-parameter.html
- AWS CLI `get-parameter` reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/get-parameter.html
- Terraform AWS provider `aws_ssm_parameter` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter
- `opentofu/setup-opentofu` action repository: https://github.com/opentofu/setup-opentofu

## Issues Found
- The workflow assumed AWS role assumption would work without declaring GitHub OIDC permissions. I added `permissions: contents: read` and `id-token: write` because `aws-actions/configure-aws-credentials` documents `id-token: write` as required for OIDC role assumption.
- The change-detection job diffed `HEAD~1..HEAD` with `fetch-depth: 2`. That only covers the last commit and can miss files in multi-commit pushes. I changed it to fetch full history and diff `${{ github.event.before }}` to `$GITHUB_SHA`, which matches GitHub's documented push payload fields. I also added initial-push handling for the all-zero `before` SHA.
- The SSM registration example referenced `steps.version.outputs.app-version`, but the step only sets an output named `version`. I corrected the parameter path to use `steps.version.outputs.version`.
- The Packer manifest example used `env("GITHUB_SHA")` directly inside `custom_data`. Packer's HCL `env` function is documented for variable defaults, so I introduced a `git_sha` variable with `default = env("GITHUB_SHA")` and changed `custom_data.git_sha` to `var.git_sha`.
- The automated deploy job targeted `production`, but the article's own promotion model says staging should track `latest` and production should use a pinned tested version. I changed the CI deploy example to target `staging` and pass `app_version=latest`.
- The production-promotion command omitted the infrastructure working directory and environment variable used elsewhere in the article. I updated it to `tofu -chdir=infrastructure apply -var="environment=prod" -var="app_version=${APP_VERSION}" -auto-approve`.

## Review Notes
- The pinned example versions remain valid, but they are not the newest releases as of 2026-05-07. The post currently uses Packer `1.10.0`, OpenTofu `1.9.0`, and `opentofu/setup-opentofu@v1`; newer releases exist if the goal is to show the latest toolchain rather than a known-good pinned example.
- The SSM version registry pattern is technically sound, but if the same `app/VERSION` is rebuilt and re-registered, the version-specific parameter path will be overwritten. That is a workflow design caveat rather than a correctness bug.
