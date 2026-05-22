# Validation Summary: How to Move Resources Between State Files in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform remote state
- Terraform import
- Terraform configuration language
- AWS Terraform provider resources and data sources

## Sources Consulted
- Terraform `state mv` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Terraform `state rm` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/rm
- Terraform `state list` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/list
- Terraform `state pull` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Terraform `import` command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform state commands reference: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform `terraform_remote_state` data source reference: https://developer.hashicorp.com/terraform/language/state/remote-state-data

## Issues Found
- The post described `terraform state mv -state` and `-state-out` without clarifying that those file options are legacy options for local state. Updated the local-file section to explicitly scope those flags to local state files.
- The remote state section implied remote state generally requires remove-and-import because state paths cannot be referenced directly. Terraform state subcommands do work with remote state, but moving between separate remote-backed configurations cannot use the local-file `-state` and `-state-out` workflow. Updated the wording to distinguish moving between separate remote-backed configurations from ordinary remote state operations.
- The remote state verification steps did not explicitly say to remove the resource declaration from the source configuration. Added that requirement so the source `terraform plan` expectation is correct.
- The remote state data source example used `data.terraform_remote_state.networking.outputs.private_subnet_ids` without noting that `terraform_remote_state` exposes root outputs only. Updated the comment to clarify that this value must be exposed by the networking state.
- The common mistakes section repeated the overbroad remote state claim. Reworded it to say that `-state` and `-state-out` are for local state files and that remove-and-import is appropriate when moving resources between separate remote-backed configurations.

## Review Notes
Terraform CLI was not installed in the local environment, so command behavior was verified against current official HashiCorp Terraform documentation rather than local `terraform --help` output.
