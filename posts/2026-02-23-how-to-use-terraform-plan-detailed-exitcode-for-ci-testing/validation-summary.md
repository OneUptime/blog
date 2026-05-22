# Validation Summary: How to Use terraform plan -detailed-exitcode for CI Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform plan files
- Bash scripting
- GitHub Actions
- HashiCorp setup-terraform action
- GitLab CI/CD
- Slack webhook notifications

## Sources Consulted
- Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `refresh` command documentation: https://developer.hashicorp.com/terraform/cli/commands/refresh
- Terraform plan tutorial and saved plan guidance: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- HashiCorp setup-terraform action README: https://github.com/hashicorp/setup-terraform
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- GitLab CI job artifacts documentation: https://docs.gitlab.com/ci/jobs/job_artifacts/

## Issues Found
- The drift detection script used `terraform refresh`, which is deprecated in current Terraform. Removed the standalone refresh command and changed the drift check to use `terraform plan -refresh-only -detailed-exitcode`, matching Terraform's current guidance.
- The drift detection script enabled `set -e` before running `terraform plan -detailed-exitcode`, so a valid exit code `2` would terminate the script before the branch logic ran. Wrapped the plan command with `set +e` / `set -e` so the script can inspect all three exit codes.
- The GitHub Actions plan step depended on reading `${PIPESTATUS[0]}` after a piped command. Added explicit `set +e` / `set -e` around the pipeline so the example remains robust when Bash is running with exit-on-error behavior.
- The GitHub Actions workflow created a pull request comment but did not declare token permissions. Added `contents: read` and `pull-requests: write` permissions so the `actions/github-script` comment step has the documented access it needs.
- The refresh-only gotcha said the command checks for drift "without generating a change plan." Clarified that refresh-only mode avoids proposing infrastructure changes, while still producing a refresh-only plan.

## Review Notes
- The core `terraform plan -detailed-exitcode` explanation is correct: Terraform documents exit code `0` for an empty diff, `1` for an error, and `2` for a non-empty diff.
- Terraform was not installed in the local workspace, so CLI behavior was verified against official Terraform documentation rather than local `terraform --help` output.
