# Validation Summary: How to Handle State When Using Terraform with Feature Branches

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (workspaces, backends, state)
- Terraform S3 backend with DynamoDB locking
- AWS (S3, DynamoDB, Lambda, EC2)
- GitHub Actions (pull_request, pull_request_target, schedule triggers)
- Bash scripting
- Git CLI

## Sources Consulted
- Terraform CLI documentation — workspaces (`terraform workspace new/select`): https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform `terraform.workspace` expression: https://developer.hashicorp.com/terraform/language/state/workspaces
- Terraform S3 backend: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform `init -reconfigure` and partial backend configuration: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform `plan -detailed-exitcode` (exit codes 0/1/2): https://developer.hashicorp.com/terraform/cli/commands/plan
- `hashicorp/setup-terraform@v3` action: https://github.com/hashicorp/setup-terraform
- `actions/checkout@v4` and `actions/github-script@v7`: https://github.com/actions
- GitHub Actions environment files (`$GITHUB_ENV`): https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-environment-variable
- GitHub Actions `pull_request` / `pull_request_target` events: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows
- `git branch --show-current` (added in Git 2.22)

## Issues Found
- In Pattern 2's Ephemeral Environment workflow, the "Comment PR with Environment URL" step referenced `${{ env.BRANCH_SLUG }}`, but `BRANCH_SLUG` was only set as a local shell variable inside the previous step's `run:` block. Shell variables do not propagate across GitHub Actions steps, so the expression would have resolved to an empty string and the comment URL would have been broken (`https://.dev.example.com`). Fixed by appending `BRANCH_SLUG` to `$GITHUB_ENV` so subsequent steps can read it via the `env` context.

## Review Notes
- The use of `pull_request_target` for the `closed` action is intentional (it runs in the base branch context with secrets available) and is a valid pattern for cleanup workflows, though authors using it should be aware of the security implications when checking out PR-author code.
- The `terraform plan -detailed-exitcode` step with `continue-on-error: true` will treat both "changes detected" (exit 2) and "error" (exit 1) as `outcome == 'failure'`. That is acceptable for an alerting workflow but readers wanting to distinguish the two would need to inspect the exit code directly.
- As of Terraform 1.10+, the S3 backend supports native state locking without DynamoDB (`use_lockfile = true`). The post's DynamoDB-based locking example remains correct and widely used, but readers on newer versions may prefer the native option.
- The partial backend configuration pattern (placeholder `key` in `backend.tf` overridden by `-backend-config` at `init` time) is the officially supported approach since variables cannot appear in backend blocks.
