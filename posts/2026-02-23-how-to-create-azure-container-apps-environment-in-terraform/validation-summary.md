# Validation Summary: How to Create Azure Container Apps Environment in Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure-as-code guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Container Apps
- Azure Container Apps environments and workload profiles
- Azure Virtual Network and subnet delegation
- Azure Log Analytics
- Azure Container Registry authentication
- Azure Queue scale rules
- Dapr components for Azure Container Apps
- Azure Blob Storage state store

## Sources Consulted
- HashiCorp AzureRM provider documentation for `azurerm_container_app`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/container_app.html.markdown
- HashiCorp AzureRM provider documentation for `azurerm_container_app_environment`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/container_app_environment.html.markdown
- HashiCorp AzureRM provider documentation for `azurerm_container_app_environment_dapr_component`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/container_app_environment_dapr_component.html.markdown
- HashiCorp AzureRM 4.0 upgrade guide: https://library.tf/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- Microsoft Learn, Azure Container Apps environments: https://learn.microsoft.com/en-us/azure/container-apps/environment
- Microsoft Learn, custom virtual networks for Azure Container Apps: https://learn.microsoft.com/en-gb/azure/container-apps/custom-virtual-networks
- Dapr documentation for Azure Blob Storage state store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-blobstorage/

## Issues Found
- Updated the AzureRM provider constraint from `~> 3.80` to `~> 4.0` so the examples use the current provider family.
- Added missing variable declarations for values referenced later in the Terraform snippets: database connection string, queue connection string, ACR credentials, and storage account name.
- Corrected the Container Apps subnet example from `/23` to `/21` to match the current AzureRM provider documentation for `infrastructure_subnet_id`.
- Added `logs_destination = "log-analytics"` to match current AzureRM logging configuration when `log_analytics_workspace_id` is supplied.
- Changed the logging explanation from saying Log Analytics is universally required to saying it is used to collect logs.
- Corrected comments that referred to Azure networking as VPC and that described `internal_load_balancer_enabled = false` as private-only access.
- Added `workload_profile_name` to the container app resources so they actually run on the workload profiles defined in the environment.
- Replaced generic `custom_scale_rule` Azure Queue examples with the provider-supported `azure_queue_scale_rule` block and required `authentication` block.
- Added the missing storage account resource used by the Dapr component.
- Updated the Dapr Azure Blob Storage state store from legacy `v1` to recommended `v2` for new state stores, and added the required `containerName` metadata.

## Review Notes
Terraform is not installed in the workspace, so I could not run `terraform validate`. The HCL was reviewed against current official provider and platform documentation.
