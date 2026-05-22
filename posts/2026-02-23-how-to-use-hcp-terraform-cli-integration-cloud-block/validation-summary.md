# Validation Summary: How to Use HCP Terraform CLI Integration (cloud block)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- HCP Terraform
- Terraform `cloud` block
- HCP Terraform CLI-driven workflow
- HCP Terraform VCS-driven workflow
- HCP Terraform workspace variables and Workspaces API

## Sources Consulted
- Terraform CLI integration with HCP Terraform: https://developer.hashicorp.com/terraform/cli/cloud
- HCP Terraform CLI-driven run workflow: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/cli
- Terraform `cloud` block reference: https://developer.hashicorp.com/terraform/language/block/terraform#cloud
- HCP Terraform remote operations: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/remote-operations
- HCP Terraform workspace variables: https://developer.hashicorp.com/terraform/cloud-docs/variables/managing-variables
- HCP Terraform workspace variables API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables
- HCP Terraform workspaces API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- Migrating from the remote backend: https://developer.hashicorp.com/terraform/cli/cloud/migrating
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `show` command reference: https://developer.hashicorp.com/terraform/cli/commands/show

## Issues Found
- The introduction implied that all execution and variable management always happen remotely. Updated it to clarify that remote execution and workspace variable management happen in HCP Terraform by default, while local execution mode is also supported.
- The workflow section described CLI-driven and VCS-driven workflows as "execution modes." Updated it to distinguish workflow type from workspace execution mode.
- The VCS-driven workflow explanation implied the `cloud` block tells HCP Terraform which organization and workspace to use for VCS-triggered runs. Updated it to clarify that VCS applies use the workspace's VCS settings as the source of truth, while the `cloud` block is useful for CLI-driven speculative plans.
- The variables section incorrectly stated that variables need to be set in HCP Terraform rather than passed with command-line flags for remote execution. Updated it to reflect Terraform 1.1+ support for run-specific variables through `-var`, `-var-file`, and `TF_VAR_` in CLI-driven runs.
- The structured output section incorrectly claimed Terraform 1.6 introduced structured run output for the cloud block and showed `terraform plan` without the required `-json` flag after setting `TF_CLI_ARGS_plan="-json"`. Reworked the section to describe human-readable structured run output and machine-readable JSON via remote saved plans and `terraform show -json`, noting the Terraform CLI 1.6 requirement for remote saved plans.
- The migration section recommended `terraform init -migrate-state` for moving from the `remote` backend to the `cloud` block. Updated it to match HashiCorp guidance: replace the backend block with the cloud block, run `terraform init`, and continue using the same HCP Terraform workspaces when already using the remote backend.
- The `.gitignore` example ignored `.terraform.lock.hcl` while later recommending it be committed. Removed `.terraform.lock.hcl` from the ignore example and clarified that the provider lock file should be committed for reproducible provider selections.

## Review Notes
The examples use placeholder organization, workspace, workspace ID, and token environment variable names. Those are acceptable for illustrative snippets, but production documentation could mention that HCP Europe organizations may need `terraform login app.terraform.io/eu` and the corresponding hostname configuration.
