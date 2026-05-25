# Validation Summary: How to Clean Up Stale Resources in Terraform State

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform refresh-only planning and apply mode
- Terraform `moved` blocks
- Terraform lifecycle meta-arguments
- Terraform data sources and check blocks
- GitHub Actions workflow scheduling

## Sources Consulted
- HashiCorp Terraform CLI `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform refresh command reference: https://developer.hashicorp.com/terraform/cli/commands/refresh
- HashiCorp Terraform refresh-only tutorial: https://developer.hashicorp.com/terraform/tutorials/state/refresh
- HashiCorp Terraform state CLI tutorial: https://developer.hashicorp.com/terraform/tutorials/state/state-cli
- HashiCorp Terraform state command reference: https://developer.hashicorp.com/terraform/cli/commands/state
- HashiCorp Terraform state pull command reference: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- HashiCorp Terraform state move overview: https://developer.hashicorp.com/terraform/cli/state/move
- HashiCorp Terraform module refactoring and `moved` blocks: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- HashiCorp Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- HashiCorp Terraform data sources documentation: https://developer.hashicorp.com/terraform/language/data-sources
- HashiCorp Terraform check block reference: https://developer.hashicorp.com/terraform/language/block/check
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- actions/github-script repository documentation: https://github.com/actions/github-script

## Issues Found
- The post said `terraform plan -refresh-only` updates state. This is inaccurate: the plan command previews refresh-only state changes, while `terraform apply -refresh-only` writes them. Updated the section to distinguish previewing from applying.
- The scripted orphaned-resource detection piped `grep "will be destroyed"` into `grep "not in configuration"`, but Terraform's plan output normally prints those details on separate lines. Updated the script to count lines containing `is not in configuration`.
- The data source section described stale data sources as resources needing cleanup and used a non-standard example error. Updated it to explain that data sources are read-only, are re-read during refresh or plan when possible, and usually fail with provider-specific lookup errors when the referenced object is missing.
- The `prevent_destroy` example implied broad protection against accidental deletion. Added the Terraform caveat that it protects while the resource block remains in configuration.

## Review Notes
Terraform was not installed in the local environment, so command behavior was validated against official HashiCorp documentation rather than local `terraform --help` output. The post still uses `terraform state rm`, which remains valid, but Terraform 1.7 and later also supports configuration-driven `removed` blocks for removing objects from state without destroying them.
