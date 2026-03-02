# How to Configure Azure Provider with Multiple Subscriptions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Multi-Subscription, Provider, AzureRM, Enterprise

Description: Learn how to configure the Terraform AzureRM provider to manage resources across multiple Azure subscriptions using provider aliases and practical patterns.

---

Most Azure environments beyond small projects use multiple subscriptions. You might have separate subscriptions for production, staging, shared services, and networking. Terraform handles this through provider aliases, letting you define multiple instances of the AzureRM provider, each targeting a different subscription.

## Why Multiple Subscriptions

Organizations use multiple Azure subscriptions for several reasons:

- **Billing isolation** - Each team or project gets its own subscription with separate cost tracking
- **Security boundaries** - Subscriptions provide a natural permission boundary
- **Resource limits** - Azure has per-subscription resource quotas
- **Environment separation** - Production and development stay in separate blast radii
- **Compliance** - Regulatory requirements may mandate isolation of certain workloads

Terraform needs to work across these boundaries when your infrastructure spans subscriptions.

## Basic Multi-Subscription Setup

The core pattern is simple: define multiple provider blocks with different aliases, each pointing to a different subscription.

```hcl
# versions.tf
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

# providers.tf

# Default provider - production subscription
provider "azurerm" {
  features {}
  subscription_id = var.production_subscription_id
}

# Alias for shared services subscription
provider "azurerm" {
  alias   = "shared"
  features {}
  subscription_id = var.shared_services_subscription_id
}

# Alias for networking subscription
provider "azurerm" {
  alias   = "networking"
  features {}
  subscription_id = var.networking_subscription_id
}
```

```hcl
# variables.tf
variable "production_subscription_id" {
  description = "Subscription ID for production resources"
  type        = string
}

variable "shared_services_subscription_id" {
  description = "Subscription ID for shared services"
  type        = string
}

variable "networking_subscription_id" {
  description = "Subscription ID for networking hub"
  type        = string
}
```

## Using Aliased Providers in Resources

When you create resources, you specify which provider instance to use with the `provider` meta-argument:

```hcl
# This resource goes to the default (production) subscription
resource "azurerm_resource_group" "app" {
  name     = "app-production-rg"
  location = "eastus"
}

# This resource goes to the shared services subscription
resource "azurerm_resource_group" "shared" {
  provider = azurerm.shared

  name     = "shared-services-rg"
  location = "eastus"
}

# This resource goes to the networking subscription
resource "azurerm_resource_group" "network" {
  provider = azurerm.networking

  name     = "network-hub-rg"
  location = "eastus"
}
```

## Hub-and-Spoke Networking Example

A common multi-subscription pattern is hub-and-spoke networking. The hub VNet lives in a networking subscription, and spoke VNets in application subscriptions peer back to the hub.

```hcl
# providers.tf
provider "azurerm" {
  features {}
  subscription_id = var.spoke_subscription_id
}

provider "azurerm" {
  alias   = "hub"
  features {}
  subscription_id = var.hub_subscription_id
}

# The hub VNet already exists - reference it with a data source
data "azurerm_virtual_network" "hub" {
  provider            = azurerm.hub
  name                = "hub-vnet"
  resource_group_name = "network-hub-rg"
}

# Create the spoke VNet in the application subscription
resource "azurerm_virtual_network" "spoke" {
  name                = "app-spoke-vnet"
  resource_group_name = azurerm_resource_group.app.name
  location            = azurerm_resource_group.app.location
  address_space       = ["10.1.0.0/16"]
}

# Peering from spoke to hub (created in spoke subscription)
resource "azurerm_virtual_network_peering" "spoke_to_hub" {
  name                      = "spoke-to-hub"
  resource_group_name       = azurerm_resource_group.app.name
  virtual_network_name      = azurerm_virtual_network.spoke.name
  remote_virtual_network_id = data.azurerm_virtual_network.hub.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
}

# Peering from hub to spoke (created in hub subscription)
resource "azurerm_virtual_network_peering" "hub_to_spoke" {
  provider = azurerm.hub

  name                      = "hub-to-app-spoke"
  resource_group_name       = "network-hub-rg"
  virtual_network_name      = "hub-vnet"
  remote_virtual_network_id = azurerm_virtual_network.spoke.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
}
```

## Passing Providers to Modules

When using modules, you pass provider aliases through the `providers` argument:

```hcl
# Root module - providers.tf
provider "azurerm" {
  features {}
  subscription_id = var.app_subscription_id
}

provider "azurerm" {
  alias   = "dns"
  features {}
  subscription_id = var.dns_subscription_id
}

# Module that creates an app and registers its DNS
module "web_app" {
  source = "./modules/web-app"

  # Pass both providers to the module
  providers = {
    azurerm     = azurerm       # default provider for app resources
    azurerm.dns = azurerm.dns   # aliased provider for DNS records
  }

  app_name    = "my-web-app"
  dns_zone    = "example.com"
}
```

Inside the module, declare which providers it expects:

```hcl
# modules/web-app/providers.tf
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
      configuration_aliases = [
        azurerm.dns  # Declares that this module needs a 'dns' alias
      ]
    }
  }
}

# modules/web-app/main.tf
resource "azurerm_resource_group" "app" {
  # Uses the default provider (app subscription)
  name     = "${var.app_name}-rg"
  location = "eastus"
}

resource "azurerm_linux_web_app" "app" {
  name                = var.app_name
  resource_group_name = azurerm_resource_group.app.name
  location            = azurerm_resource_group.app.location
  service_plan_id     = azurerm_service_plan.plan.id

  site_config {}
}

# DNS record in the DNS subscription
data "azurerm_dns_zone" "zone" {
  provider            = azurerm.dns
  name                = var.dns_zone
  resource_group_name = "dns-rg"
}

resource "azurerm_dns_cname_record" "app" {
  provider            = azurerm.dns
  name                = var.app_name
  zone_name           = data.azurerm_dns_zone.zone.name
  resource_group_name = data.azurerm_dns_zone.zone.resource_group_name
  ttl                 = 300
  record              = azurerm_linux_web_app.app.default_hostname
}
```

## Authentication Across Subscriptions

The authentication method (service principal, managed identity, or Azure CLI) must have access to all target subscriptions. Here are the patterns:

### Single Service Principal with Cross-Subscription Access

```bash
# Grant the same SP access to multiple subscriptions
az role assignment create \
  --assignee "$SP_APP_ID" \
  --role "Contributor" \
  --scope "/subscriptions/PROD_SUB_ID"

az role assignment create \
  --assignee "$SP_APP_ID" \
  --role "Contributor" \
  --scope "/subscriptions/SHARED_SUB_ID"

az role assignment create \
  --assignee "$SP_APP_ID" \
  --role "Contributor" \
  --scope "/subscriptions/NETWORK_SUB_ID"
```

```hcl
# All providers use the same credentials, just different subscription IDs
provider "azurerm" {
  features {}
  subscription_id = var.prod_subscription_id
  # Credentials come from ARM_* env vars
}

provider "azurerm" {
  alias   = "shared"
  features {}
  subscription_id = var.shared_subscription_id
  # Same credentials, different subscription
}
```

### Different Service Principals per Subscription

For stricter isolation, use different service principals:

```hcl
provider "azurerm" {
  features {}
  subscription_id = var.prod_subscription_id
  client_id       = var.prod_client_id
  client_secret   = var.prod_client_secret
  tenant_id       = var.tenant_id
}

provider "azurerm" {
  alias   = "shared"
  features {}
  subscription_id = var.shared_subscription_id
  client_id       = var.shared_client_id
  client_secret   = var.shared_client_secret
  tenant_id       = var.tenant_id
}
```

## Using for_each with Providers

A common question is whether you can dynamically create providers based on a list of subscriptions. The answer is no - Terraform requires provider configurations to be static and known at plan time. You cannot use `for_each` or `count` with provider blocks.

If you need to manage the same infrastructure across many subscriptions, consider these alternatives:

```hcl
# Option 1: Generate provider blocks with a template
# Use a script or Terragrunt to generate .tf files per subscription

# Option 2: Use Terraform workspaces with variable files
# Each workspace targets a different subscription via tfvars

# Option 3: Use a wrapper module called once per subscription
# Terragrunt excels at this pattern
```

## Data Source Lookups Across Subscriptions

You can read data from any subscription you have access to:

```hcl
# Look up a Key Vault in the shared services subscription
data "azurerm_key_vault" "shared" {
  provider            = azurerm.shared
  name                = "shared-keyvault"
  resource_group_name = "shared-services-rg"
}

# Use a secret from that Key Vault
data "azurerm_key_vault_secret" "db_password" {
  provider     = azurerm.shared
  name         = "db-admin-password"
  key_vault_id = data.azurerm_key_vault.shared.id
}

# Use the secret in the production subscription
resource "azurerm_mssql_server" "db" {
  name                         = "app-sql-server"
  resource_group_name          = azurerm_resource_group.app.name
  location                     = azurerm_resource_group.app.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = data.azurerm_key_vault_secret.db_password.value
}
```

## Summary

Managing multiple Azure subscriptions in Terraform comes down to provider aliases. Define one provider block per subscription, use the `alias` argument to name them, and specify `provider = azurerm.alias_name` on each resource. For modules, use `configuration_aliases` to declare expected providers and pass them through the `providers` argument. Keep your authentication strategy simple - a single service principal with cross-subscription access works for most teams, while separate principals per subscription provide stronger isolation when compliance requires it.
