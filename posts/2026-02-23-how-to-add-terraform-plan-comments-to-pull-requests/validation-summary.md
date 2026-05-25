# Validation Summary: How to Add Terraform Plan Comments to Pull Requests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- HashiCorp setup-terraform GitHub Action
- GitHub Actions workflows
- actions/github-script
- GitHub REST API issue comments
- Bash and GitHub Actions workflow outputs

## Sources Consulted
- HashiCorp setup-terraform README: https://github.com/hashicorp/setup-terraform
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- GitHub Actions workflow commands: https://docs.github.com/en/actions/reference/workflow-commands-for-github-actions
- GitHub Actions expressions and `fromJSON`: https://docs.github.com/en/actions/reference/evaluate-expressions-in-workflows-and-actions
- GitHub REST API issue comments: https://docs.github.com/en/rest/issues/comments
- actions/github-script README: https://github.com/actions/github-script
- Terraform PR Commenter Marketplace page: https://github.com/marketplace/actions/terraform-pr-commenter

## Issues Found
- Several `actions/github-script` examples placed raw Markdown triple-backtick code fences inside JavaScript template literals. Raw backticks terminate JavaScript template literals, so the scripts would fail to parse. Replaced those Markdown fences with tilde fences inside the generated comment bodies.
- The simple example interpolated `${{ steps.plan.outputs.stdout }}` directly into JavaScript source. Multiline Terraform output or special characters can break the script. Changed it to pass the plan through an environment variable and read `process.env.PLAN_OUTPUT`.
- The sensitive-output example wrote multiline plan output to `$GITHUB_OUTPUT` using `echo "plan_output=$(cat plan_output.txt)"`, which is not valid for multiline output. Replaced it with the documented heredoc-style `$GITHUB_OUTPUT` syntax.
- The destructive-change example was described as a failing check but only printed a warning. Updated it to pass plan output through an environment variable, catch replacements as well as direct destroys, and exit non-zero when destructive changes are found.
- Removed an unused `statusEmoji` variable from the improved comment example.

## Review Notes
- The `stdout`, `stderr`, and `exitcode` step outputs are valid when `hashicorp/setup-terraform` installs its wrapper, which is enabled by default.
- `terraform plan -detailed-exitcode` is used correctly: exit code `0` means no changes, `2` means changes are present, and `1` indicates an error.
- The examples use `actions/github-script@v7`, which is still valid for the shown API usage, though newer major versions of the action exist.
