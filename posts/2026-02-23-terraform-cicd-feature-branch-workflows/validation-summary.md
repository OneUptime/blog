# Validation Summary: How to Implement Terraform CI/CD with Feature Branch Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform state and workspaces
- GitHub Actions workflows
- AWS credential configuration for GitHub Actions
- Git branch workflows
- Bash shell scripting
- HCL

## Sources Consulted
- Terraform CLI `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI `workspace select` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- Terraform state and backend documentation: https://developer.hashicorp.com/terraform/language/state
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions concurrency documentation: https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency
- GitHub Actions events documentation for `pull_request` and `github.head_ref`: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- GitHub Actions workflow commands documentation for `$GITHUB_STEP_SUMMARY`: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- HashiCorp `setup-terraform` GitHub Action documentation: https://github.com/hashicorp/setup-terraform
- AWS `configure-aws-credentials` GitHub Action documentation: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The GitHub Actions examples used `aws-actions/configure-aws-credentials` with `role-to-assume` but did not grant `id-token: write`. Added top-level `permissions` blocks with `id-token: write` and `contents: read` so OIDC-based role assumption and checkout work as documented.
- The apply concurrency examples described queuing multiple applies, but `cancel-in-progress: false` alone only prevents canceling the running job and does not allow more than one pending run by default. Added `queue: max` to the concurrency examples so multiple pending apply runs can queue.
- The stale branch check used `git rev-list HEAD..origin/main` without ensuring `origin/main` was fetched. Added `git fetch origin main --prune` before computing the behind count.

## Review Notes
- Terraform CLI was not installed in the local workspace, so command validation was performed against official Terraform CLI documentation instead of local `terraform --help`.
- Saved Terraform plan files can contain sensitive values in cleartext. The examples keep plan files local to the job and do not upload them as artifacts.
