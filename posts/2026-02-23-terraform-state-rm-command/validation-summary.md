# Validation Summary: How to Use terraform state rm to Remove Resources from State

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform resource addressing
- Terraform `removed` blocks
- AWS provider resource examples
- Bash scripting

## Sources Consulted
- Terraform `state rm` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/rm
- Terraform state commands reference: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform `state list` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/list
- Terraform `state push` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform remove a resource from state guide: https://developer.hashicorp.com/terraform/language/state/remove
- Terraform `removed` block reference: https://developer.hashicorp.com/terraform/language/block/removed
- Terraform refactor state guide: https://developer.hashicorp.com/terraform/language/state/refactor
- Terraform modules configuration documentation: https://developer.hashicorp.com/terraform/language/modules/configuration

## Issues Found
- The post incorrectly stated that `terraform state rm` does not have a built-in dry-run option. Updated the section to use the official `terraform state rm -dry-run ADDRESS` option, which reports matching instances without removing them.
- The early behavior summary said `terraform plan` will not show the resource after `state rm`. Clarified that the existing object is no longer shown as managed, but if the resource block remains in configuration, Terraform will typically plan to create a replacement object.
- The backup example implied `-backup` applies generally. Clarified that specifying a custom backup path with `-backup` is for local state, matching the current Terraform documentation that describes it as a legacy local-state option.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was validated against current official HashiCorp documentation rather than local `--help` output. The `removed` block example and Terraform 1.7+ version note are accurate.
