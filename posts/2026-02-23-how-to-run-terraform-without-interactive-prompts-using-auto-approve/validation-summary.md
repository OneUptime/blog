# Validation Summary: How to Run Terraform Without Interactive Prompts Using -auto-approve

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform plans and saved plan files
- Terraform environment variables
- GitHub Actions
- GitLab CI/CD
- Jenkins Pipeline
- Bash scripting
- jq

## Sources Consulted
- Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `destroy` command reference: https://developer.hashicorp.com/terraform/cli/commands/destroy
- Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- Terraform automation tutorial: https://developer.hashicorp.com/terraform/tutorials/automation/automate-terraform
- Terraform plan tutorial: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- HashiCorp `setup-terraform` GitHub Action: https://github.com/hashicorp/setup-terraform
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ee/ci/yaml/
- GitLab job artifacts documentation: https://docs.gitlab.com/ci/jobs/job_artifacts/
- Jenkins Pipeline steps reference: https://www.jenkins.io/doc/pipeline/steps/core/

## Issues Found
- The `safe-apply.sh` example used `set -e` directly with `terraform plan -detailed-exitcode`. Terraform returns exit code `2` when a plan succeeds with changes, so Bash would exit before the script could inspect `PLAN_EXIT`. I changed the example to temporarily disable `errexit` around the `terraform plan` command, capture the exit code, and then re-enable `errexit`.
- The safety section said "If you must use `-auto-approve`" but the script applies a saved plan with `terraform apply tfplan`, not `-auto-approve`. I changed the sentence to "If you must run automated applies" so the explanation matches the example.

## Review Notes
The Terraform CLI claims are otherwise consistent with the official documentation: `terraform apply -auto-approve` skips approval in automatic plan mode, saved plans passed to `terraform apply` do not prompt for approval, `terraform destroy` accepts most apply options and is equivalent to destroy-mode apply, `-detailed-exitcode` returns 0/1/2 as described, and `TF_INPUT=false` disables prompts for missing input. Terraform CLI was not installed in the local environment, so command behavior was verified against official HashiCorp documentation rather than local `terraform --help` output.
