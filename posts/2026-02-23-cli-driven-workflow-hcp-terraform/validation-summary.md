# Validation Summary: How to Configure CLI-Driven Workflow in HCP Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI
- HCP Terraform
- Terraform `cloud` block
- HCP Terraform workspaces and execution modes
- HCP Terraform workspace variables
- Terraform Enterprise/HCP Terraform `tfe` provider variables
- GitHub Actions CI/CD

## Sources Consulted
- HashiCorp Developer: The CLI-driven remote run workflow for HCP Terraform - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/cli
- HashiCorp Developer: Use HCP Terraform with the Terraform CLI - https://developer.hashicorp.com/terraform/cli/cloud
- HashiCorp Developer: Terraform block reference, including `cloud` and `workspaces` - https://developer.hashicorp.com/terraform/language/block/terraform
- HashiCorp Developer: `terraform login` command - https://developer.hashicorp.com/terraform/cli/commands/login
- HashiCorp Developer: Terraform CLI configuration file and `TF_TOKEN_*` credentials - https://developer.hashicorp.com/terraform/cli/config/config-file
- HashiCorp Developer: Variables in HCP Terraform - https://developer.hashicorp.com/terraform/cloud-docs/variables
- HashiCorp Developer: Workspace settings and execution mode - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings
- HashiCorp Developer: Manage and view runs in HCP Terraform - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/manage
- Terraform Registry: `hashicorp/tfe` provider `tfe_variable` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/variable

## Issues Found
- The cancellation instructions said pressing `Ctrl+C` sends a cancellation request to HCP Terraform and marks the run as canceled. HashiCorp documents different behavior for CLI-driven remote runs: for a remote plan, `Ctrl+C` stops log streaming but does not stop the remote plan; for a remote apply, it cancels only if the apply is still pending, and otherwise stops log streaming while the apply continues remotely. Updated the section to describe the correct behavior and left UI cancellation as the reliable cancellation path.

## Review Notes
- Terraform is not installed in the local workspace, so CLI behavior was checked against HashiCorp's current official documentation rather than local `terraform --help` output.
- The CI/CD example is technically valid, but HashiCorp recommends API-driven workflows where possible for non-interactive automation. The existing example uses `terraform apply -auto-approve`, which is the documented CLI approach for non-interactive remote execution.
