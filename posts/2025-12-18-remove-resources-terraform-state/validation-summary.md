# Validation Summary: How to Remove Resources from Terraform State

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform `removed` blocks
- Terraform `moved` blocks
- Terraform import workflow
- GitHub Actions
- AWS provider resource examples

## Sources Consulted
- HashiCorp Terraform CLI `state rm` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/rm
- HashiCorp Terraform CLI `state pull` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- HashiCorp Terraform CLI `state push` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/push
- HashiCorp Terraform CLI `import` command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- HashiCorp Terraform `removed` block reference: https://developer.hashicorp.com/terraform/language/block/removed
- HashiCorp Terraform remove from state guide: https://developer.hashicorp.com/terraform/language/state/remove
- HashiCorp Terraform `moved` block reference: https://developer.hashicorp.com/terraform/language/block/moved
- HashiCorp Terraform module refactoring guide: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- HashiCorp Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- GitHub Actions workflow syntax reference: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The `removed` block examples used individual `count` and `for_each` instance keys (`aws_instance.web[0]` and `aws_security_group.dynamic["deprecated-sg"]`). HashiCorp's current remove-from-state guide says `removed.from` cannot include instance keys for resources configured with multiple instances. Updated the examples to target the whole resource address instead.
- The bulk removal command generation used `instance.tags.Name` as the `for_each` state key. That only works when the resource key exactly matches the Name tag. Updated the example to iterate with `for key, instance in aws_instance.legacy` and use `key` in the generated state address.
- The state migration example pulled and pushed an entire state file while describing selective resource movement. Replaced it with a backup, `terraform state rm`, and `terraform import` workflow, matching HashiCorp's recommended remove-and-import approach for moving resources between state files.

## Review Notes
- Terraform was not installed in the local environment, so CLI behavior was checked against the current official HashiCorp command references instead of local `terraform --help` output.
- The GitHub Actions workflow is syntactically plausible for a manually-triggered cleanup job, but production workflows should add tighter approval and input validation around state-changing operations.
