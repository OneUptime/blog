# How to Configure the Azure Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Provider Configuration, Infrastructure as Code, AzureRM

Description: Learn how to configure the AzureRM provider in OpenTofu, including authentication methods, feature flags, and subscription targeting.

## Introduction

The AzureRM provider is the primary provider for managing Microsoft Azure resources with OpenTofu. Configuring it correctly sets up authentication, subscription targeting, and provider-wide feature flags that control resource lifecycle behaviour.

## Minimal Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.6.0"
}

provider "azurerm" {
  features {}  # Required block, even if empty

  subscription_id = var.subscription_id
}
```

## Feature Flags

The `features` block controls destructive or sensitive operations:

```hcl
provider "azurerm" {
  features {
    resource_group {
      # Prevent deletion of non-empty resource groups
      prevent_deletion_if_contains_resources = true
    }

    key_vault {
      # Keep soft-deleted Key Vaults and secrets recoverable
      purge_soft_delete_on_destroy         = false
      purge_soft_deleted_secrets_on_destroy = false
      recover_soft_deleted_key_vaults      = true
      recover_soft_deleted_secrets         = true
    }

    virtual_machine {
      # Delete the OS disk when Linux or Windows VMs are deleted
      delete_os_disk_on_deletion = true
    }

    log_analytics_workspace {
      permanently_delete_on_destroy = false
    }
  }
}
```

## Multiple Subscriptions with Aliases

```hcl
provider "azurerm" {
  alias           = "dev"
  subscription_id = var.dev_subscription_id
  features {}
}

provider "azurerm" {
  alias           = "prod"
  subscription_id = var.prod_subscription_id
  features {}
}

resource "azurerm_resource_group" "dev_rg" {
  provider = azurerm.dev
  name     = "rg-dev-app"
  location = "East US"
}
```

## Authentication Configuration

The provider supports multiple authentication methods. For Service Principal authentication:

```hcl
provider "azurerm" {
  features {}

  # Service Principal with client secret
  client_id       = var.client_id
  client_secret   = var.client_secret
  tenant_id       = var.tenant_id
  subscription_id = var.subscription_id
}
```

Environment variables (preferred for CI/CD):

```bash
export ARM_CLIENT_ID="00000000-0000-0000-0000-000000000000"
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_TENANT_ID="00000000-0000-0000-0000-000000000000"
export ARM_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
```

## Variables

```hcl
variable "subscription_id" {
  type        = string
  description = "Azure Subscription ID"
}

variable "location" {
  type        = string
  default     = "East US"
  description = "Azure region for resource deployment"
}
```

## Conclusion

Always specify the `features {}` block even when empty - it is required by the provider. Use `prevent_deletion_if_contains_resources = true` for production resource groups to guard against accidental deletions, and authenticate via environment variables or managed identity rather than hardcoded credentials.
