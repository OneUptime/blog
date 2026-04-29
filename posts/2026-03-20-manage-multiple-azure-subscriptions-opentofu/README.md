# How to Manage Multiple Azure Subscriptions with Provider Aliases in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Multi-Subscription, Provider Aliases, Infrastructure as Code

Description: Learn how to use OpenTofu provider aliases to manage resources across multiple Azure subscriptions from a single configuration.

In enterprise Azure environments, resources are distributed across multiple subscriptions for isolation, billing, and governance. OpenTofu provider aliases let you target different subscriptions from a single configuration.

## Configuring Multiple Subscription Providers

```hcl
# Production subscription

provider "azurerm" {
  alias           = "production"
  subscription_id = var.production_subscription_id
  features {}
}

# Staging subscription
provider "azurerm" {
  alias           = "staging"
  subscription_id = var.staging_subscription_id
  features {}
}

# Shared services subscription
provider "azurerm" {
  alias           = "shared"
  subscription_id = var.shared_subscription_id
  features {}
}

variable "production_subscription_id" { type = string }
variable "staging_subscription_id"    { type = string }
variable "shared_subscription_id"     { type = string }
```

## Creating Resources in Specific Subscriptions

```hcl
resource "azurerm_resource_group" "production" {
  provider = azurerm.production
  name     = "rg-production-eastus"
  location = "East US"
}

resource "azurerm_resource_group" "staging" {
  provider = azurerm.staging
  name     = "rg-staging-eastus"
  location = "East US"
}

resource "azurerm_resource_group" "shared" {
  provider = azurerm.shared
  name     = "rg-shared-eastus"
  location = "East US"
}

resource "azurerm_virtual_network" "production" {
  provider            = azurerm.production
  name                = "vnet-production"
  resource_group_name = azurerm_resource_group.production.name
  location            = azurerm_resource_group.production.location
  address_space       = ["10.1.0.0/16"]
}

resource "azurerm_virtual_network" "shared" {
  provider            = azurerm.shared
  name                = "vnet-shared"
  resource_group_name = azurerm_resource_group.shared.name
  location            = azurerm_resource_group.shared.location
  address_space       = ["10.3.0.0/16"]
}
```

## Cross-Subscription Resource References

Reference resources across subscriptions - for example, VNet peering:

```hcl
resource "azurerm_virtual_network_peering" "prod_to_shared" {
  provider                  = azurerm.production
  name                      = "prod-to-shared"
  resource_group_name       = azurerm_resource_group.production.name
  virtual_network_name      = azurerm_virtual_network.production.name
  remote_virtual_network_id = azurerm_virtual_network.shared.id
  allow_forwarded_traffic   = true
}

resource "azurerm_virtual_network_peering" "shared_to_prod" {
  provider                  = azurerm.shared
  name                      = "shared-to-prod"
  resource_group_name       = azurerm_resource_group.shared.name
  virtual_network_name      = azurerm_virtual_network.shared.name
  remote_virtual_network_id = azurerm_virtual_network.production.id
  allow_forwarded_traffic   = true
}
```

## Passing Providers to Modules

```hcl
module "production_baseline" {
  source = "./modules/subscription-baseline"

  providers = {
    azurerm = azurerm.production
  }

  subscription_name = "production"
  address_space     = "10.1.0.0/16"
}

module "staging_baseline" {
  source = "./modules/subscription-baseline"

  providers = {
    azurerm = azurerm.staging
  }

  subscription_name = "staging"
  address_space     = "10.2.0.0/16"
}
```

```hcl
# modules/subscription-baseline/main.tf
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${var.subscription_name}"
  location = "East US"
}
```

## Using Service Principal with Subscription Scoping

For automation, use a service principal with Contributor access to each target subscription:

```bash
# Authenticate
export ARM_CLIENT_ID="<app-id>"
export ARM_CLIENT_SECRET="<password>"
export ARM_TENANT_ID="<tenant-id>"

# No need to set ARM_SUBSCRIPTION_ID when using provider aliases
```

## Conclusion

Managing multiple Azure subscriptions in OpenTofu uses the same provider alias pattern as AWS multi-account. Define one `azurerm` provider alias per subscription, pass providers to modules explicitly, and use cross-subscription resource references for shared infrastructure like VNet peering and shared DNS zones.
