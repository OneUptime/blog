# Validation Summary: How to Create Azure Container Instances in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Container Instances
- Azure Container Registry
- Azure Virtual Network
- Azure NAT Gateway
- Azure Files
- Docker containers

## Sources Consulted
- HashiCorp Terraform Registry: azurerm_container_group resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_group
- HashiCorp Terraform Registry / AzureRM 4.0 upgrade guidance for subscription ID requirements: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- Microsoft Learn: Azure Container Instances virtual network scenarios and limitations: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-virtual-network-concepts
- Microsoft Learn: Deploy Azure Container Instances with GPU resources: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-gpu
- Microsoft Learn: Mount an Azure Files volume in Azure Container Instances: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-volume-azure-files
- Microsoft Learn: Quickstart for Azure Container Instances with Terraform: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-quickstart-terraform
- HashiCorp Terraform Registry: azurerm_storage_share resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_share

## Issues Found
- The provider configuration pinned AzureRM to `~> 3.0`, while the current AzureRM major version is 4.x. Updated the example to use `~> 4.0`, added `subscription_id = var.subscription_id`, and added the matching sensitive variable because AzureRM 4.x requires an explicit subscription ID for plan/apply.
- The private VNet example omitted the NAT Gateway required for supported outbound connectivity from ACI container groups deployed into a virtual network. Added a Standard public IP, NAT gateway, public IP association, and subnet association.
- The Azure Files share example used `storage_account_name` for `azurerm_storage_share`, which is deprecated in current AzureRM in favor of `storage_account_id`. Updated the file share resource to use `storage_account_id`.
- The GPU container group example described ACI GPU resources as usable, but Microsoft retired ACI GPU container groups on July 14, 2025. Replaced the non-working Terraform GPU example with a retirement note and directed GPU workloads to AKS or GPU-enabled Azure virtual machines.

## Review Notes
Terraform was not installed in the local environment, so validation was performed by checking the examples against official provider and Microsoft Learn documentation rather than running `terraform validate`.
