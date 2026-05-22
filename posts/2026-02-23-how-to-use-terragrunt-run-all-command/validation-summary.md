# Validation Summary: How to Use Terragrunt run-all Command

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terragrunt
- Terraform
- OpenTofu
- Infrastructure as Code
- CI/CD

## Sources Consulted
- Terragrunt `run` command documentation: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt global flags documentation: https://docs.terragrunt.com/reference/cli/global-flags/
- Terragrunt `dag graph` command documentation: https://docs.terragrunt.com/reference/cli/commands/dag/graph/
- Terragrunt HCL blocks documentation for `dependency` and `dependencies`: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt v0.93.0 release notes for removed deprecated retry attributes: https://github.com/gruntwork-io/terragrunt/releases/tag/v0.93.0

## Issues Found
- The post used the deprecated `terragrunt run-all` command form throughout. Updated the title, description, prose, and command examples to the current `terragrunt run --all` form.
- The post used deprecated `--terragrunt-*` flag names. Updated examples to current flags such as `--parallelism`, `--non-interactive`, `--log-level`, and `--queue-ignore-errors`.
- The post used deprecated include/exclude flags. Updated the targeting examples to current `--filter` expressions.
- The dependency graph example used `terragrunt graph-dependencies`, which has been replaced by `terragrunt dag graph`.
- The non-interactive section said `--terragrunt-non-interactive` passes `-auto-approve` to Terraform. Current Terragrunt docs state that `run --all apply` and `run --all destroy` automatically add `-auto-approve`; updated the wording.
- The retry configuration used removed top-level attributes: `retryable_errors`, `retry_max_attempts`, and `retry_sleep_interval_sec`. Replaced them with the current `errors { retry { ... } }` block.
- The output example used an older prefix format. Updated it to reflect current Terragrunt log output with unit labels.

## Review Notes
Terragrunt was not installed in the local environment, so command behavior was verified against official Terragrunt documentation and release notes rather than local `--help` output.
