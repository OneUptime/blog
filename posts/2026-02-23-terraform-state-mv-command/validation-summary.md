# Validation Summary: How to Use terraform state mv to Move Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform resource addressing
- Terraform modules
- Terraform moved blocks
- Terraform import and state commands

## Sources Consulted
- Terraform CLI `state mv` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Terraform CLI state commands overview: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform resource address reference: https://developer.hashicorp.com/terraform/cli/state/resource-addressing
- Terraform module refactoring and `moved` blocks documentation: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform CLI `state rm` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/rm
- Terraform CLI `state push` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform CLI `import` command reference: https://developer.hashicorp.com/terraform/cli/commands/import

## Issues Found
- The post stated that `terraform state mv` does not have a built-in dry-run flag. Official Terraform documentation lists `-dry-run`, so the Dry Run section was corrected to use `terraform state mv -dry-run`.
- The basic syntax explanation said both arguments are resource addresses. Official documentation allows resource instance, resource, and module addresses, so the wording was corrected and the same-resource-type constraint was added.
- The backup section implied custom `-backup` paths apply generally. Official documentation treats `-backup` as a legacy local-state option for `state mv`, so the wording now scopes custom backup paths to local state.
- The between-state-files section did not distinguish local state files from remote backends clearly. The wording now identifies `-state` and `-state-out` as a local state file workflow and describes `state rm` plus `import` as a common remote-backend approach.
- The typo example misspelled the resource type as `aws_intance`, but `terraform state mv` requires resource moves to keep the same resource type. The example now uses a typo in the resource name instead.

## Review Notes
The post is technically relevant and the examples are consistent with current Terraform CLI documentation after the corrections above. The local environment did not have the `terraform` binary installed, so command behavior was verified against official HashiCorp documentation rather than local `terraform --help` output.
