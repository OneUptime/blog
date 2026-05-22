# Validation Summary: How to Use terraform state replace-provider for Provider Migration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform provider source addresses
- Terraform dependency lock file
- Terraform import and state commands

## Sources Consulted
- HashiCorp Terraform CLI command reference: `terraform state replace-provider` - https://developer.hashicorp.com/terraform/cli/commands/state/replace-provider
- HashiCorp Terraform CLI state command reference - https://developer.hashicorp.com/terraform/cli/commands/state
- HashiCorp Terraform provider requirements documentation - https://developer.hashicorp.com/terraform/language/providers/requirements
- HashiCorp Terraform dependency lock file documentation - https://developer.hashicorp.com/terraform/language/files/dependency-lock
- HashiCorp Terraform import command reference - https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform Registry Datadog provider page - https://registry.terraform.io/providers/DataDog/datadog/latest

## Issues Found
- The introduction said `replace-provider` applies when splitting a monolithic provider into separate providers. That is too broad because `replace-provider` only updates provider source addresses for resources already using one provider address. Changed the example to switching to a compatible fork of the same provider.
- The command syntax used generic `FROM_PROVIDER TO_PROVIDER` names. Updated it to `FROM_PROVIDER_FQN TO_PROVIDER_FQN`, matching the official command reference.
- The remote state section showed `-state=path/to/terraform.tfstate` without noting that it is only for local state. Updated the wording to "specific local state files" because HashiCorp documents `-state`, `-state-out`, and `-backup` as legacy local-state-only options for this command.
- The lock file troubleshooting section advised deleting `.terraform.lock.hcl`. Replaced that with `terraform init`, which is the documented normal way to update provider selections in the dependency lock file.
- The sample confirmation prompt used wording closer to other Terraform commands. Adjusted it to the current `replace-provider` confirmation wording pattern.

## Review Notes
Terraform CLI was not installed in the local environment, so command behavior was verified against current HashiCorp documentation and Terraform Registry pages instead of local `terraform --help` output.
