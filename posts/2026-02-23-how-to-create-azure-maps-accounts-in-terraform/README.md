# How to Create Azure Maps Accounts in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Azure Maps, Geospatial, Infrastructure as Code, Location Services

Description: Learn how to create and configure Azure Maps accounts using Terraform for adding geospatial capabilities like routing, geocoding, and mapping to your applications.

---

Adding location-based features to your applications - maps, geocoding, route planning, traffic awareness - requires a geospatial platform. Azure Maps provides these capabilities as a set of REST APIs and SDKs that integrate naturally with the rest of your Azure infrastructure. If you are already on Azure, it makes sense to use Azure Maps rather than adding another vendor to your stack.

This guide covers creating Azure Maps accounts with Terraform, configuring authentication, managing access, and setting up the infrastructure around it.

## What Azure Maps Offers

Azure Maps provides a range of geospatial services:

- **Render**: Map tiles and imagery for displaying interactive maps
- **Search**: Geocoding (address to coordinates), reverse geocoding, and point of interest search
- **Route**: Driving, walking, and truck routing with traffic awareness
- **Weather**: Current conditions and forecasts for any location
- **Traffic**: Real-time traffic flow and incident data
- **Indoor maps (retired)**: Azure Maps Creator was retired on September 30, 2025, so do not use it for new deployments

## Creating an Azure Maps Account

The Terraform resource is simple:

```hcl
# versions.tf

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}

# Resource group
resource "azurerm_resource_group" "maps" {
  name     = "rg-maps-prod-eastus"
  location = "East US"
}

# Azure Maps Account
resource "azurerm_maps_account" "main" {
  name                = "maps-prod-contoso"
  resource_group_name = azurerm_resource_group.maps.name
  location            = azurerm_resource_group.maps.location
  sku_name            = "G2"

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

Azure Maps has three Terraform SKU values:
- **S0 (Gen 1 S0)**: Deprecated and no longer available for new deployments.
- **S1 (Gen 1 S1)**: Deprecated and no longer available for new deployments.
- **G2 (Gen 2)**: The current recommended tier. Pay-per-use pricing with access to current Azure Maps features.

For new deployments, always use G2.

## Authentication Options

Azure Maps supports three authentication methods: shared keys, Microsoft Entra ID, and shared access signature (SAS) tokens. The two most common options for application deployments are:

### Shared Key Authentication

The simplest option - use the account's primary or secondary key:

```hcl
# Store the primary key in Key Vault
resource "azurerm_key_vault_secret" "maps_key" {
  name         = "azure-maps-primary-key"
  value        = azurerm_maps_account.main.primary_access_key
  key_vault_id = azurerm_key_vault.main.id
}
```

Terraform state will still contain the secret value, so secure your state backend and access to plan files.

### Microsoft Entra ID Authentication (Recommended)

For production, use Microsoft Entra ID authentication with managed identity:

```hcl
# User-assigned managed identity for the application
resource "azurerm_user_assigned_identity" "app" {
  name                = "id-app-prod"
  location            = azurerm_resource_group.maps.location
  resource_group_name = azurerm_resource_group.maps.name
}

# Grant the identity Azure Maps Data Reader role
resource "azurerm_role_assignment" "maps_reader" {
  scope                = azurerm_maps_account.main.id
  role_definition_name = "Azure Maps Data Reader"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# For applications that need write access
resource "azurerm_role_assignment" "maps_contributor" {
  scope                = azurerm_maps_account.main.id
  role_definition_name = "Azure Maps Data Contributor"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}
```

Microsoft Entra ID authentication is more secure because you do not need to distribute API keys. The managed identity handles token acquisition automatically.

## CORS Configuration

If your web application calls Azure Maps APIs directly from the browser, you should configure restrictive CORS origins:

```hcl
resource "azurerm_maps_account" "main" {
  name                = "maps-prod-contoso"
  resource_group_name = azurerm_resource_group.maps.name
  location            = azurerm_resource_group.maps.location
  sku_name            = "G2"

  # CORS configuration for browser-based access
  cors {
    allowed_origins = [
      "https://www.contoso.com",
      "https://app.contoso.com",
    ]
  }

  tags = {
    environment = "production"
  }
}
```

## Integration with Web Applications

Here is how to wire up Azure Maps with a web application:

```hcl
# Static Web App that uses Azure Maps
resource "azurerm_static_web_app" "map_app" {
  name                = "swa-mapapp-prod"
  resource_group_name = azurerm_resource_group.maps.name
  location            = azurerm_resource_group.maps.location
  sku_tier            = "Standard"
  sku_size            = "Standard"

  app_settings = {
    # Pass the Maps client ID for Microsoft Entra ID authentication
    "AZURE_MAPS_CLIENT_ID" = azurerm_maps_account.main.x_ms_client_id
  }
}
```

Or with an App Service:

```hcl
# App Service that uses Azure Maps
resource "azurerm_linux_web_app" "map_api" {
  name                = "app-mapapi-prod"
  location            = azurerm_resource_group.maps.location
  resource_group_name = azurerm_resource_group.maps.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = true
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  app_settings = {
    "AZURE_MAPS_CLIENT_ID" = azurerm_maps_account.main.x_ms_client_id
    # The managed identity handles authentication - no key needed
  }
}

# Grant the App Service's identity access to Maps
resource "azurerm_role_assignment" "app_maps" {
  scope                = azurerm_maps_account.main.id
  role_definition_name = "Azure Maps Data Reader"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}
```

## Azure Maps Creator for Indoor Maps

Azure Maps Creator indoor map service was retired on September 30, 2025. The Terraform `azurerm_maps_creator` resource is deprecated and should not be used for new deployments.

## Multiple Maps Accounts for Different Environments

```hcl
variable "environments" {
  description = "Environments to create Maps accounts for"
  type        = map(object({
    sku = string
  }))
  default = {
    "production"  = { sku = "G2" }
    "staging"     = { sku = "G2" }
    "development" = { sku = "G2" }
  }
}

resource "azurerm_maps_account" "envs" {
  for_each = var.environments

  name                = "maps-${each.key}-contoso"
  resource_group_name = azurerm_resource_group.maps.name
  location            = azurerm_resource_group.maps.location
  sku_name            = each.value.sku

  tags = {
    environment = each.key
  }
}
```

## Diagnostic Settings

Monitor your Maps API usage:

```hcl
resource "azurerm_monitor_diagnostic_setting" "maps" {
  name                       = "diag-maps"
  target_resource_id         = azurerm_maps_account.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.central.id

  metric {
    category = "AllMetrics"
  }
}
```

## Outputs

```hcl
output "maps_account_id" {
  description = "Resource ID of the Azure Maps account"
  value       = azurerm_maps_account.main.id
}

output "maps_client_id" {
  description = "Client ID for Microsoft Entra ID authentication"
  value       = azurerm_maps_account.main.x_ms_client_id
}

# Do not output the access key - it should only be in Key Vault
output "maps_name" {
  description = "Name of the Azure Maps account"
  value       = azurerm_maps_account.main.name
}
```

## Best Practices

**Use Microsoft Entra ID authentication in production.** Shared keys are convenient for development but should not be used in production applications. Microsoft Entra ID with managed identity eliminates key management.

**Use the G2 SKU.** The Gen 1 SKUs (S0, S1) are deprecated and no longer available for new deployments. G2 is pay-per-use, so you only pay for what you consume.

**Monitor usage.** Azure Maps charges per API call. Set up budgets and alerts to avoid surprise bills, especially with search or routing APIs that can generate high volumes.

**Cache geocoding results.** Azure Maps terms of service allow caching of geocoding results. If your application repeatedly looks up the same addresses, cache the results to reduce API calls and improve response times.

**Restrict CORS origins.** Only allow your application's domains in the CORS configuration. Do not use wildcard origins in production.

**Use the Azure Maps Web SDK.** For browser-based maps, the Azure Maps Web SDK provides a rich interactive map control. Pass the client ID from Terraform through your application configuration.

## Wrapping Up

Azure Maps accounts in Terraform are straightforward to set up. Create the account, configure authentication (preferably Microsoft Entra ID with managed identity), and wire it into your applications. The geospatial APIs cover everything from basic geocoding to complex routing and traffic scenarios. With Terraform managing the infrastructure, your Maps configuration is version-controlled and consistent across environments.
