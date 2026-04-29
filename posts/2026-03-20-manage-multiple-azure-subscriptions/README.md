# How to Manage Multiple Azure Subscriptions with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Multiple Subscriptions, Provider Aliases, Infrastructure as Code, DevOps

Description: Learn how to configure OpenTofu to manage resources across multiple Azure subscriptions using provider aliases and service principal authentication.

## Introduction

Large Azure environments often use multiple subscriptions for isolation: one per environment (dev, staging, prod) or one per business unit. OpenTofu manages multi-subscription deployments through multiple `azurerm` provider aliases.

## Configuring Multiple Subscription Providers

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

# Default provider - primary subscription
provider "azurerm" {
  features {}
  subscription_id = var.prod_subscription_id
  tenant_id       = var.tenant_id
  client_id       = var.client_id
  client_secret   = var.client_secret
}

# Alias for the dev subscription
provider "azurerm" {
  alias           = "dev"
  features {}
  subscription_id = var.dev_subscription_id
  tenant_id       = var.tenant_id
  client_id       = var.client_id
  client_secret   = var.client_secret
}

# Alias for the shared services subscription
provider "azurerm" {
  alias           = "shared"
  features {}
  subscription_id = var.shared_subscription_id
  tenant_id       = var.tenant_id
  client_id       = var.client_id
  client_secret   = var.client_secret
}
```

## Deploying Resources to Specific Subscriptions

```hcl
# Prod resource (default provider)
resource "azurerm_resource_group" "prod_app" {
  name     = "prod-app-rg"
  location = "East US"
}

# Dev resource (uses alias)
resource "azurerm_resource_group" "dev_app" {
  provider = azurerm.dev
  name     = "dev-app-rg"
  location = "East US"
}

# Shared services resource
resource "azurerm_resource_group" "shared_network" {
  provider = azurerm.shared
  name     = "shared-network-rg"
  location = "East US"
}
```

## Passing Provider to Modules

```hcl
module "prod_networking" {
  source = "./modules/networking"
  providers = {
    azurerm = azurerm  # Default provider (prod)
  }
  resource_group_name = "prod-network-rg"
}

module "dev_networking" {
  source = "./modules/networking"
  providers = {
    azurerm = azurerm.dev  # Dev subscription
  }
  resource_group_name = "dev-network-rg"
}
```

## Using Environment Variables for Authentication

```bash
# Production subscription
export ARM_SUBSCRIPTION_ID="prod-subscription-uuid"
export ARM_TENANT_ID="tenant-uuid"
export ARM_CLIENT_ID="client-id-uuid"
export ARM_CLIENT_SECRET="client-secret"

# For CI/CD with multiple subscriptions, use separate credentials per job
```

## Using Azure Managed Identity in CI

```hcl
# Use managed identity on a self-hosted agent running on an Azure VM
provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
  use_msi         = true
}
```

## Per-Subscription State Files

```hcl
# Each subscription gets its own state file in a central storage account
terraform {
  backend "azurerm" {
    resource_group_name  = "opentofu-state-rg"
    storage_account_name = "opentofustate"
    container_name       = "tfstate"
    key                  = "subscriptions/prod/app/tofu.tfstate"
    subscription_id      = "shared-subscription-uuid"  # State in shared sub
  }
}
```

## Conclusion

Managing multiple Azure subscriptions in OpenTofu requires multiple `azurerm` provider blocks with aliases, each pointing to a different subscription ID. Pass the appropriate provider alias to modules using the `providers` meta-argument. Store state in a central shared subscription to avoid credential sprawl for state access.
