# Validation Summary: How to Create Azure Maps Accounts in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Maps
- Microsoft Entra ID
- Azure RBAC
- Azure Key Vault
- Azure Static Web Apps
- Azure App Service
- Azure Monitor diagnostic settings

## Sources Consulted
- HashiCorp Terraform Registry: `azurerm_maps_account` resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/maps_account
- HashiCorp Terraform Registry: `azurerm_maps_creator` resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/maps_creator
- Microsoft Learn: Authentication with Azure Maps - https://learn.microsoft.com/en-us/azure/azure-maps/azure-maps-authentication
- Microsoft Learn: Manage the pricing tier of your Azure Maps account - https://learn.microsoft.com/en-us/azure/azure-maps/how-to-manage-pricing-tier
- Microsoft Learn: Creator for indoor maps - https://learn.microsoft.com/en-us/azure/azure-maps/creator-indoor-maps
- Microsoft Learn: Azure Maps Spatial Get Geofence REST API - https://learn.microsoft.com/en-us/rest/api/maps/spatial/get-geofence
- HashiCorp Developer: Manage sensitive data in your configuration - https://developer.hashicorp.com/terraform/language/state/sensitive-data
- HashiCorp Terraform Registry: `azurerm_static_web_app` resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/static_web_app

## Issues Found
- The `azurerm_maps_account` examples omitted the required `location` argument. Added `location = azurerm_resource_group.maps.location` to each Azure Maps account resource example.
- The post said Azure Maps had "two SKU options" while listing three, and did not reflect current Gen1 availability. Updated the SKU wording to state that `S0` and `S1` are deprecated and no longer available for new deployments, while `G2` is the recommended Gen2 SKU.
- The post said Azure Maps supports two authentication methods. Microsoft documents three: shared key, Microsoft Entra ID, and SAS token. Updated the authentication section accordingly.
- The post used the older "Azure AD" naming throughout. Updated references to Microsoft Entra ID while preserving the original authentication guidance.
- The Key Vault secret example did not mention that Terraform state and plan files can still contain secret values. Added a concise warning to secure the state backend and plan files.
- The post described CORS as something that must be configured for browser use, but Azure Maps accounts have default CORS behavior. Reworded the guidance to recommend restrictive CORS origins instead.
- The post promoted Azure Maps Spatial/geofencing and Azure Maps Creator examples even though Spatial APIs and Creator were retired on September 30, 2025. Removed the active Creator Terraform example and replaced those claims with retirement guidance.
- The monitoring and conclusion sections mentioned geofencing as an active scenario. Updated those references to current search, routing, and traffic scenarios.

## Review Notes
The post remains pinned to AzureRM provider `~> 3.80`, which is older than the current provider line but still valid for the examples shown. A future modernization pass could update the tutorial to AzureRM 4.x and include the provider authentication changes required by that major version.
