# Validation Summary: How to Use -refresh=false Flag in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform state refresh
- HCP Terraform
- Terraform import
- Terraform plan and apply workflows

## Sources Consulted
- HashiCorp Terraform CLI `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform CLI `refresh` command reference: https://developer.hashicorp.com/terraform/cli/commands/refresh
- HashiCorp Terraform refresh-only tutorial: https://developer.hashicorp.com/terraform/tutorials/state/refresh
- HashiCorp HCP Terraform run modes and options: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/modes-and-options
- HashiCorp HCP Terraform workspace settings: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings

## Issues Found
- The HCP Terraform section incorrectly described refresh behavior as a workspace-level setting. Updated it to state that skipping automatic refresh is a per-run planning option available through CLI, API, or UI run options.
- The refresh-only workflow said the approach avoids paying refresh cost twice, including once during apply. Updated the wording because applying a saved plan does not create a new plan; the workflow avoids refreshing again during the planning step after a refresh-only state update.

## Review Notes
Terraform was not installed in the local environment, so CLI flags were verified against current HashiCorp documentation rather than local `terraform --help` output. The `-refresh=false`, `-refresh-only`, `-target`, `-out`, and saved plan examples are current and valid according to the referenced documentation.
