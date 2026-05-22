# Validation Summary: How to Use Terragrunt Error Hooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terragrunt
- HCL
- Bash
- GitHub Actions
- Slack webhooks

## Sources Consulted
- Terragrunt Hooks documentation: https://docs.terragrunt.com/features/units/hooks/
- Terragrunt HCL terraform block reference: https://docs.terragrunt.com/reference/hcl/blocks/#terraform
- Terragrunt HCL errors block reference: https://docs.terragrunt.com/reference/hcl/blocks/#errors
- Terragrunt runtime control documentation: https://docs.terragrunt.com/features/units/runtime-control/
- Terraform CLI state list command: https://developer.hashicorp.com/terraform/cli/commands/state/list
- Terraform CLI show command: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform CLI version command: https://developer.hashicorp.com/terraform/cli/commands/version
- GitHub Actions workflow commands: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions

## Issues Found
- The post used top-level Terragrunt retry attributes (`retryable_errors`, `retry_max_attempts`, and `retry_sleep_interval_sec`). Current Terragrunt documentation describes retry behavior under the `errors { retry { ... } }` block with `retryable_errors`, `max_attempts`, and `sleep_interval_sec`, so the retry examples were updated to that structure.
- The post claimed a failure-only after hook could inspect `TG_CTX_TF_EXIT_CODE`. Current Terragrunt hook context documentation lists `TG_CTX_TF_PATH`, `TG_CTX_COMMAND`, and `TG_CTX_HOOK_NAME`, but not `TG_CTX_TF_EXIT_CODE`. The failure-only examples were changed to use `error_hook` blocks with `on_errors = [".*"]`.
- Several examples used `after_hook` with `run_on_error = true` for failure-only behavior. Terragrunt documents `run_on_error = true` as making an after hook run even when the Terraform/OpenTofu command fails, not only on failure. These examples were changed to `error_hook` where the intended behavior was failure-only.
- The CI example used `$TERRAGRUNT_COMMAND`, which is not one of the documented hook context variables. It now uses `$TG_CTX_COMMAND`.
- The state snapshot example read all matching `/tmp/pre-apply-state-*.json` files at once, which could concatenate multiple JSON documents. It now selects the newest matching snapshot before running `jq`.

## Review Notes
- Local CLI validation was not possible because `terragrunt` and `terraform` are not installed in the review environment. The review was performed against the current official documentation and by scanning the post for deprecated or undocumented symbols.
- The examples still assume common external tools and environment variables such as `curl`, `jq`, `SLACK_WEBHOOK_URL`, and CI-provided variables are available.
