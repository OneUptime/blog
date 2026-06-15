# Validation Summary: How to Deploy Azure Resources with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- HashiCorp Random provider
- Microsoft Azure Resource Groups
- Azure Virtual Network and subnets
- Azure Network Security Groups
- Azure Linux Virtual Machines
- Azure Kubernetes Service
- Azure SQL Database
- Azure Storage Accounts

## Sources Consulted
- HashiCorp AzureRM provider v4 upgrade guide: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/guides/4.0-upgrade-guide.html.markdown
- HashiCorp AzureRM provider features block documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/guides/features-block.html.markdown
- HashiCorp AzureRM `azurerm_kubernetes_cluster` documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/kubernetes_cluster.html.markdown
- HashiCorp AzureRM `azurerm_kubernetes_cluster_node_pool` documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/kubernetes_cluster_node_pool.html.markdown
- HashiCorp AzureRM `azurerm_linux_virtual_machine` documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/linux_virtual_machine.html.markdown
- HashiCorp AzureRM `azurerm_mssql_server`, `azurerm_mssql_database`, and `azurerm_mssql_virtual_network_rule` documentation: https://github.com/hashicorp/terraform-provider-azurerm/tree/main/website/docs/r
- HashiCorp AzureRM `azurerm_storage_account` and `azurerm_storage_container` documentation: https://github.com/hashicorp/terraform-provider-azurerm/tree/main/website/docs/r
- HashiCorp Random provider `random_id` documentation: https://github.com/hashicorp/terraform-provider-random/blob/main/docs/resources/id.md
- Microsoft AKS supported Kubernetes versions: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Azure Bastion configuration settings: https://learn.microsoft.com/en-us/azure/bastion/configuration-settings
- Microsoft Azure storage account naming rules: https://learn.microsoft.com/en-us/azure/azure-resource-manager/troubleshooting/error-storage-account-name
- Microsoft Azure SQL logical server documentation: https://learn.microsoft.com/en-us/azure/azure-sql/database/logical-servers

## Issues Found
- Updated the AzureRM provider constraint from `~> 3.0` to `~> 4.0` and added the required `subscription_id` provider argument, because AzureRM v4 requires the subscription ID to be set in configuration or via `ARM_SUBSCRIPTION_ID`.
- Added the HashiCorp Random provider and a `random_id` suffix for Azure SQL logical server and Storage Account names, because both resources require globally unique names and the original fixed names could fail during deployment.
- Corrected "Everything in Azure lives in a resource group" to "Most Azure resources live in a resource group" because subscriptions, tenants, management groups, and some control-plane objects are not contained by resource groups.
- Changed the Azure Bastion subnet from `/27` to `/26` and updated the diagram, because new Azure Bastion deployments require `AzureBastionSubnet` to be `/26` or larger.
- Changed the NSG association from the unused public subnet to the private subnet where the VM network interface is created, so the NSG rules actually apply to the VM shown in the example.
- Updated AKS from Kubernetes `1.28` to `1.35`, because `1.28` is no longer in standard AKS support as of the review date.
- Replaced deprecated AKS autoscaling arguments `enable_auto_scaling` with `auto_scaling_enabled` for AzureRM v4.
- Removed the deprecated/removed `managed` argument from `azure_active_directory_role_based_access_control`, because current AzureRM v4 documentation no longer includes it.
- Corrected the Storage Account comment from "private endpoint" to "network rules" because the snippet configures service endpoint/network rule access and does not create an Azure Private Endpoint.
- Replaced deprecated `azurerm_storage_container.storage_account_name` with `storage_account_id`, which is the current AzureRM provider argument.

## Review Notes
Terraform CLI is not installed in the workspace, so local `terraform fmt` and `terraform validate` could not be run. The snippets were checked against current official provider documentation and Microsoft Learn documentation instead.
