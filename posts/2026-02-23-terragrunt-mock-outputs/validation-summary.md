# Validation Summary: How to Use Terragrunt with Mock Outputs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terragrunt
- Terragrunt dependency blocks
- Terragrunt mock outputs
- Infrastructure as Code
- CI/CD planning workflows

## Sources Consulted
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt run queue documentation: https://docs.terragrunt.com/features/stacks/run-queue/
- Terragrunt run command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt global flags reference: https://docs.terragrunt.com/reference/cli/global-flags/
- Linked OneUptime complex dependency graphs guide: https://oneuptime.com/blog/post/2026-02-23-terragrunt-complex-dependency-graphs/view

## Issues Found
- The post described `mock_outputs_merge_strategy_with_state = "shallow"` as the default. Terragrunt's official HCL block reference lists `no_merge` as the default, with `shallow` as an explicit strategy that fills missing output keys from mocks. Updated the comments and explanation to match the documented behavior.
- The post used the older `terragrunt run-all plan --terragrunt-non-interactive` command. Current Terragrunt CLI documentation uses `terragrunt run --all -- plan` and the global `--non-interactive` flag. Updated the example to `terragrunt run --all --non-interactive -- plan`.
- The post used `--terragrunt-log-level debug`. Current Terragrunt global flag documentation lists `--log-level`. Updated the debugging command to `terragrunt plan --log-level debug`.
- The `skip_outputs` explanation said dependency outputs could not be referenced at all. Terragrunt documents that `skip_outputs = true` sets outputs to `mock_outputs` if configured, otherwise an empty map. Clarified that references fail without `mock_outputs`.

## Review Notes
The remaining examples are syntactically plausible HCL snippets and match Terragrunt's documented `dependency`, `mock_outputs`, `mock_outputs_allowed_terraform_commands`, and `skip_outputs` attributes. The linked OneUptime guide resolves successfully.
