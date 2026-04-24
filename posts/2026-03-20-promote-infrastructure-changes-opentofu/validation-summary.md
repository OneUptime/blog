# Validation Summary: How to Promote Infrastructure Changes Across Environments in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI and HCL
- GitHub Actions
- GitHub Environments and deployment protection rules
- AWS Systems Manager Parameter Store (`aws_ssm_parameter`)

## Sources Consulted
- OpenTofu `tofu plan` docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply` docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu `terraform_data` docs: https://opentofu.org/docs/language/resources/tf-data/
- OpenTofu custom conditions docs: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu references to named values docs: https://opentofu.org/docs/v1.11/language/expressions/references/
- OpenTofu output values docs: https://opentofu.org/docs/language/values/outputs/
- OpenTofu `timestamp()` docs: https://opentofu.org/docs/language/functions/timestamp/
- GitHub Actions expressions docs: https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- GitHub Actions workflow syntax docs: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub deployment environments docs: https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments
- GitHub workflow commands docs (`GITHUB_OUTPUT`): https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- `opentofu/setup-opentofu` action README: https://github.com/opentofu/setup-opentofu
- AWS provider `aws_ssm_parameter` data source docs: https://registry.terraform.io/providers/-/aws/latest/docs/data-sources/ssm_parameter

## Issues Found
- The GitHub Actions workflow determined an environment in a step output but never attached the job to a GitHub Environment. I added `jobs.deploy.environment.name` so environment protection rules such as required reviewers can actually gate deployments.
- The workflow referenced `IMAGE_TAG` without defining it. I added a job-level `IMAGE_TAG` derived from `github.sha` and passed `git_commit_sha` during `tofu apply` so the later output example is consistent with the workflow.
- The post used `opentofu/setup-opentofu@v1`, while the action's current official README examples use `@v2`. I updated the action version accordingly.
- The validation example lived under `environments/staging`, which would not block a production apply. I corrected the example path to `environments/production/validation.tf` so the precondition can gate production promotion.
- The `-target` example was presented as a normal promotion workflow. OpenTofu documents targeting as an exceptional-use mechanism, so I added a brief caveat while keeping the example intact.
- The output example used `terraform.version`, which is not a valid OpenTofu named value. I replaced it with `var.opentofu_version`, which is a valid way to expose the CLI version when CI passes it in.

## Review Notes
- `timestamp()` is technically valid in an output value, but it changes on every apply. That is acceptable for audit metadata, but it does mean the output is intentionally non-stable.
- The workflow still uses direct `tofu apply` on push. That is valid, but OpenTofu's automation guidance favors a saved-plan workflow when you need exact plan/apply parity.
