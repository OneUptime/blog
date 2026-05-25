# Validation Summary: How to Create Azure Container Apps in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AzureRM Terraform Provider
- Azure Container Apps
- Azure Container Apps Environments
- Azure Container Registry
- Azure managed identities
- Azure RBAC
- Azure Service Bus scaling with KEDA
- Azure Virtual Network integration
- Log Analytics

## Sources Consulted
- HashiCorp AzureRM Provider documentation for `azurerm_container_app`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app
- HashiCorp AzureRM Provider v3.80 documentation for `azurerm_container_app`: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/container_app.html.markdown
- HashiCorp AzureRM Provider documentation for `azurerm_container_app_environment`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app_environment
- HashiCorp AzureRM Provider v3.80 documentation for `azurerm_container_app_environment`: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/container_app_environment.html.markdown
- Microsoft Learn, Managed identities in Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/managed-identity
- Microsoft Learn, Azure Container Apps image pull from Azure Container Registry with managed identity: https://learn.microsoft.com/en-us/azure/container-apps/managed-identity-image-pull
- Microsoft Learn, Scaling in Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/scale-app
- Microsoft Learn, Configure virtual networks in Azure Container Apps environments: https://learn.microsoft.com/en-us/azure/container-apps/custom-virtual-networks

## Issues Found
- The Azure Container Registry example used `registry { identity = "System" }` with `azurerm_container_app`. The AzureRM provider documents `registry.identity` as a user-assigned managed identity resource ID for image pulls, so the snippet would not be valid as written for the pinned provider. I changed the example to create an `azurerm_user_assigned_identity`, grant it `AcrPull`, attach it to the app, and use its resource ID in the `registry` block.
- The ACR role assignment depended on the system-assigned principal from the container app. That creates a practical provisioning problem for private ACR images because the app may need pull permission before it can start successfully. I changed the example to grant `AcrPull` to a user-assigned identity before creating the app and added an explicit `depends_on`.
- The VNet subnet comment said Container Apps subnets have a minimum `/23` size. Current Azure documentation distinguishes legacy Consumption-only environments from workload profile environments: `/23` applies to legacy Consumption-only environments, while workload profile environments can use `/27` or larger and require delegation to `Microsoft.App/environments`. I updated the comment to make that distinction.

## Review Notes
The post pins AzureRM `~> 3.80`, which keeps the examples in the AzureRM 3.x line. Future updates could consider an AzureRM 4.x refresh, but that would require checking provider configuration and any newer Container Apps features as a deliberate version update.
