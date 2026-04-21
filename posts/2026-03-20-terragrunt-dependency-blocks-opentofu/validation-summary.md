# Validation Summary: How to Use Terragrunt dependency Blocks with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terragrunt
- HCL configuration
- Terragrunt dependency blocks
- Terragrunt run queue and multi-unit execution

## Sources Consulted
- Terragrunt HCL blocks reference, including `dependency`, `dependencies`, `mock_outputs`, `skip_outputs`, and `mock_outputs_allowed_terraform_commands`: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt `run` command reference, including `run --all` and argument separation: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt global flags reference for `--working-dir`: https://docs.terragrunt.com/reference/cli/global-flags/
- Terragrunt CLI redesign migration guide for replacing `run-all` and `--terragrunt-working-dir`: https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt Run Queue documentation for dependency ordering: https://docs.terragrunt.com/features/stacks/run-queue/
- Terragrunt HCL functions reference for OpenTofu/Terraform built-in function support: https://docs.terragrunt.com/reference/hcl/functions/
- OpenTofu `try` function reference: https://opentofu.org/docs/language/functions/try/
- OpenTofu `compact` function reference: https://opentofu.org/docs/language/functions/compact/

## Issues Found
- The post used the deprecated `run-all` command and `--terragrunt-working-dir` flag. Updated the introduction, section heading, and command example to use the current `terragrunt run --all --working-dir environments/prod -- apply` form.
- The optional dependency example set `skip_outputs = true` while also configuring `mock_outputs`, which Terragrunt documents as "use mocks all the time if they are set." That would prevent reading the real monitoring output and would make the example always use the mock value. Removed `skip_outputs`, changed the mock SNS topic to `null`, restricted mocks to `plan` and `validate`, and used `compact([try(..., null)])` so the input remains empty when the output is absent.

## Review Notes
The remaining examples are illustrative and assume supporting Terragrunt units and OpenTofu modules define the referenced outputs and input variables. Future improvements could mention that `run --all apply` automatically adds `-auto-approve` unless overridden, and that mock outputs should generally be restricted to non-mutating validation or planning workflows.
