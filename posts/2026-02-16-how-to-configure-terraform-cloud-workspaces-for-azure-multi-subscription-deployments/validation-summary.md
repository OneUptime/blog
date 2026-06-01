# Validation Summary: Configure Terraform Cloud Workspaces for Azure Multi-Subscription Deployments

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Terraform Cloud / HCP Terraform workspaces
- HashiCorp TFE Terraform provider
- Azure CLI
- AzureRM provider authentication with service principals
- Terraform variable sets, run triggers, workspace variables, and team access

## Sources Consulted
- Microsoft Learn: Azure CLI `az ad sp create-for-rbac` reference, including `--sdk-auth` deprecation: https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest#az-ad-sp-create-for-rbac
- Terraform Registry: `hashicorp/tfe` provider `tfe_workspace` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace
- Terraform Registry: `hashicorp/tfe` provider `tfe_run_trigger` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/run_trigger
- Terraform Registry: `hashicorp/tfe` provider `tfe_outputs` data source: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/data-sources/outputs
- Terraform Registry: `hashicorp/tfe` provider `tfe_variable` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/variable
- Terraform Registry: `hashicorp/tfe` provider `tfe_variable_set` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/variable_set
- Terraform Registry: `hashicorp/tfe` provider `tfe_workspace_variable_set` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_variable_set
- Terraform Registry: `hashicorp/tfe` provider `tfe_team_access` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team_access
- Terraform Registry: `hashicorp/tfe` provider `tfe_oauth_client` data source and resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/data-sources/oauth_client
- Terraform Registry: AzureRM provider service principal authentication guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_client_secret
- HashiCorp Developer: Terraform remote state guidance recommending `tfe_outputs` for HCP Terraform / Terraform Enterprise outputs: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- HashiCorp Developer: Sentinel policy enforcement with HCP Terraform and Terraform Enterprise: https://developer.hashicorp.com/sentinel/docs/terraform

## Issues Found
- The Azure CLI service principal creation commands used `--sdk-auth`, which Microsoft documents as deprecated and scheduled for removal. Removed the deprecated flag while keeping the role and scope assignment intact; the default command output still includes the service principal credential fields needed for Terraform authentication.
- The Terraform workspace-management snippet referenced `tfe_oauth_client.github.oauth_token_id` without declaring that resource. Added a `data "tfe_oauth_client" "github"` block and updated the `vcs_repo` block to reference `data.tfe_oauth_client.github.oauth_token_id`, matching the TFE provider's documented data source.

## Review Notes
- The examples use service principal client secrets. This is valid, but for future revisions it would be worth mentioning workload identity federation / OIDC because it avoids long-lived secrets.
- The post uses the older Terraform Cloud name in prose. HashiCorp documentation now commonly uses HCP Terraform, but the technical concepts and provider resources remain applicable.
