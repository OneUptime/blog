# How to Set Up Terraform Provider Aliases for Multi-Region Azure Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, Multi-Region, Provider Aliases, IaC, DevOps, Cloud

Description: Learn how to use Terraform provider aliases to deploy Azure resources across multiple regions in a single configuration with proper state management.

---

When you deploy infrastructure to a single Azure region, you configure one `azurerm` provider and you are done. But production workloads often span multiple regions for disaster recovery, data residency, or latency optimization. That is where Terraform provider aliases come in. They let you configure multiple instances of the same provider, each targeting a different region or even a different subscription, within a single Terraform configuration.

This post covers how to set up provider aliases for multi-region Azure deployments, pass them to modules, and handle the common patterns you will encounter in real-world scenarios.

## The Basic Concept

By default, Terraform uses a single provider configuration per provider type. When you write `provider "azurerm"`, that is the default instance. Provider aliases let you create additional named instances.

```hcl
# Default provider - primary region
provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

# Aliased provider - secondary region
provider "azurerm" {
  alias           = "westus"
  features {}
  subscription_id = var.subscription_id
}
```

Both providers use the same subscription, but you can configure them differently. The alias is just a label - it does not affect what region resources deploy to. You control the region through the `location` attribute on each resource.

So why do you need aliases? Because some operations - like setting up VNet peering across regions, or creating resources in different subscriptions - require Terraform to authenticate and interact with different Azure contexts. Each provider instance can have its own credentials, subscription, and feature flags.

## Multi-Region Deployment Pattern

Here is a practical example: deploying a primary database in East US and a replica in West US.

```hcl
# variables.tf
variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "primary_location" {
  description = "Primary Azure region"
  type        = string
  default     = "eastus"
}

variable "secondary_location" {
  description = "Secondary Azure region"
  type        = string
  default     = "westus"
}
```

```hcl
# providers.tf
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85"
    }
  }
}

# Primary region provider (default)
provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

# Secondary region provider
provider "azurerm" {
  alias           = "secondary"
  features {}
  subscription_id = var.subscription_id
}
```

```hcl
# main.tf - Resources in the primary region use the default provider
resource "azurerm_resource_group" "primary" {
  name     = "rg-app-primary"
  location = var.primary_location
}

# Resources in the secondary region explicitly reference the alias
resource "azurerm_resource_group" "secondary" {
  provider = azurerm.secondary
  name     = "rg-app-secondary"
  location = var.secondary_location
}

resource "azurerm_storage_account" "primary" {
  name                     = "stprimary001"
  resource_group_name      = azurerm_resource_group.primary.name
  location                 = azurerm_resource_group.primary.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_account" "secondary" {
  provider                 = azurerm.secondary
  name                     = "stsecondary001"
  resource_group_name      = azurerm_resource_group.secondary.name
  location                 = azurerm_resource_group.secondary.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

The `provider = azurerm.secondary` attribute tells Terraform to use the aliased provider for that resource. Resources without this attribute use the default provider.

## Passing Aliases to Modules

Modules have their own provider requirements. You pass aliased providers to modules through the `providers` block in the module call.

```hcl
# Module that deploys resources in a specific region
# modules/regional-infra/main.tf
terraform {
  required_providers {
    azurerm = {
      source = "hashicorp/azurerm"
    }
  }
}

variable "location" {
  type = string
}

variable "environment" {
  type = string
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${var.environment}-${var.location}"
  location = var.location
}

resource "azurerm_virtual_network" "main" {
  name                = "vnet-${var.environment}-${var.location}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  address_space       = ["10.0.0.0/16"]
}
```

```hcl
# Root module calling the regional module twice
module "primary_infra" {
  source = "./modules/regional-infra"

  location    = var.primary_location
  environment = "prod"

  # Uses the default provider (no alias needed)
  providers = {
    azurerm = azurerm
  }
}

module "secondary_infra" {
  source = "./modules/regional-infra"

  location    = var.secondary_location
  environment = "prod"

  # Uses the aliased provider
  providers = {
    azurerm = azurerm.secondary
  }
}
```

This pattern lets you reuse the same module for both regions. The module does not know or care about provider aliases - it just uses the default `azurerm` provider. The root module decides which actual provider instance to pass in.

## Cross-Subscription Deployments

Provider aliases are also used when deploying to multiple Azure subscriptions. This is common in enterprise environments where networking lives in one subscription and workloads in another.

```hcl
# Provider for the networking subscription
provider "azurerm" {
  alias           = "networking"
  features {}
  subscription_id = var.networking_subscription_id
}

# Provider for the workload subscription (default)
provider "azurerm" {
  features {}
  subscription_id = var.workload_subscription_id
}

# Look up the hub VNet in the networking subscription
data "azurerm_virtual_network" "hub" {
  provider            = azurerm.networking
  name                = "vnet-hub"
  resource_group_name = "rg-networking"
}

# Create a spoke VNet in the workload subscription
resource "azurerm_virtual_network" "spoke" {
  name                = "vnet-spoke-workload"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.workload.name
  address_space       = ["10.1.0.0/16"]
}

# Peering from spoke to hub (in workload subscription)
resource "azurerm_virtual_network_peering" "spoke_to_hub" {
  name                      = "peer-spoke-to-hub"
  resource_group_name       = azurerm_resource_group.workload.name
  virtual_network_name      = azurerm_virtual_network.spoke.name
  remote_virtual_network_id = data.azurerm_virtual_network.hub.id
  allow_forwarded_traffic   = true
}

# Peering from hub to spoke (in networking subscription)
resource "azurerm_virtual_network_peering" "hub_to_spoke" {
  provider                  = azurerm.networking
  name                      = "peer-hub-to-spoke"
  resource_group_name       = "rg-networking"
  virtual_network_name      = data.azurerm_virtual_network.hub.name
  remote_virtual_network_id = azurerm_virtual_network.spoke.id
  allow_forwarded_traffic   = true
}
```

Each side of the VNet peering needs to be created in its respective subscription, which is why both provider instances are needed.

## Managing Multiple Regions with for_each

For deploying to many regions, you can combine provider aliases with maps, though Terraform has a limitation: you cannot dynamically generate provider aliases with `for_each`. You must declare each alias statically.

```hcl
# You must declare each provider alias explicitly
provider "azurerm" {
  alias           = "eastus"
  features {}
  subscription_id = var.subscription_id
}

provider "azurerm" {
  alias           = "westus"
  features {}
  subscription_id = var.subscription_id
}

provider "azurerm" {
  alias           = "westeurope"
  features {}
  subscription_id = var.subscription_id
}

# Map of regions to their provider aliases
locals {
  regions = {
    eastus     = "East US"
    westus     = "West US"
    westeurope = "West Europe"
  }
}
```

This is one of the pain points of provider aliases. If you need to deploy to many regions dynamically, consider using separate Terraform workspaces or configurations per region instead.

## Best Practices

Give aliases meaningful names. Use region names, subscription purposes, or environment names - something that makes the code self-documenting. Avoid generic names like `secondary` unless there truly are only two.

Keep the number of aliases manageable. If you find yourself with more than four or five aliases, consider restructuring your Terraform into separate root modules. Each root module handles one region or subscription, and you use remote state data sources to reference outputs across them.

Always explicitly pass providers to modules. Even if a module uses the default provider, being explicit about it in the `providers` block makes the code clearer and prevents surprises when aliases are added later.

Document which alias maps to which region or subscription. A comment at the top of your `providers.tf` file saves everyone time.

## Conclusion

Terraform provider aliases are the mechanism that enables multi-region and multi-subscription Azure deployments within a single configuration. They let you reuse modules across regions, set up cross-region resources like VNet peering, and manage resources in different subscriptions from one state file. While they have limitations around dynamic generation, the patterns shown here cover the most common multi-region scenarios you will encounter in Azure.
