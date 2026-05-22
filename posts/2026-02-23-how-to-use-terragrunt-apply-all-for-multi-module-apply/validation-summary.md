# Validation Summary: How to Use Terragrunt apply-all for Multi-Module Apply

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terragrunt
- Infrastructure as Code
- GitHub Actions
- AWS IAM role-based deployment

## Sources Consulted
- Terragrunt CLI `run` command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt run queue documentation: https://docs.terragrunt.com/features/stacks/run-queue/
- Terragrunt HCL blocks reference, including `dependency` and `errors`: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt deprecated attributes migration guide: https://docs.terragrunt.com/migrate/deprecated-attributes/
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- GitHub Actions concurrency documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency
- AWS configure credentials action repository: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- Updated the recommended Terragrunt multi-unit command from deprecated `run-all apply` usage to the current `run --all -- apply` form. Terragrunt's CLI redesign documents `run-all` as deprecated in favor of `run --all`.
- Replaced deprecated `--terragrunt-*` flags with current flag names, including `--non-interactive`, `--parallelism`, and `--queue-ignore-errors`.
- Replaced deprecated include/exclude directory examples with current `--filter` examples for selective runs.
- Removed the outdated Terragrunt confirmation prompt example and replaced it with a current explanation of external dependency prompts.
- Corrected the non-interactive mode explanation: Terragrunt automatically adds `-auto-approve` for `run --all apply`; `--non-interactive` skips Terragrunt prompts.
- Replaced removed top-level retry attributes (`retryable_errors`, `retry_max_attempts`, and `retry_sleep_interval_sec`) with the current `errors { retry ... }` block.
- Added a caveat to saved-plan guidance: downstream multi-module plans use dependency outputs available at plan time, not outputs that earlier modules may produce later during apply.
- Corrected first-run mock output guidance so mocks are required for first-time planning with missing dependency state, not for a static-path `run --all apply` sequence where dependencies are applied first.

## Review Notes
The post is technically relevant and remains useful after updating it for the current Terragrunt CLI. Terragrunt still supports compatibility for some deprecated commands and flags during migrations, but the post now shows the current documented form.
