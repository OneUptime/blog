# How to Configure Azure Provider (AzureRM) in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, AzureRM, Provider, Infrastructure as Code, Cloud

Description: A complete guide to configuring the AzureRM provider in Terraform, covering authentication methods, required features, and practical setup for Azure infrastructure management.

---

The AzureRM provider is how Terraform talks to Microsoft Azure. Unlike some other providers that are relatively straightforward to set up, AzureRM has some unique requirements and configuration options that are worth understanding before you start writing resources. This guide walks through the full setup process, from basic configuration to production-ready patterns.

## Prerequisites

Before configuring the provider, you need:

- Terraform 1.0 or later installed
- An Azure subscription
- Azure CLI installed (for the easiest authentication method)

If you are using the Azure CLI, log in first:

```bash
# Log in to Azure
az login

# Verify your subscription
az account show
```

## Basic Provider Configuration

Here is the minimum configuration to get the AzureRM provider working:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

# provider.tf
provider "azurerm" {
  features {}

  # Optional: specify the subscription explicitly
  subscription_id = "your-subscription-id-here"
}
```

The `features {}` block is mandatory. Even if you do not configure anything inside it, the empty block must be present or Terraform will throw an error. This is one of the quirks of the AzureRM provider that catches people on first setup.

## The features Block Explained

The `features` block controls provider-level behavior for certain resource types. It affects how Terraform handles resource deletion, updates, and other lifecycle operations:

```hcl
provider "azurerm" {
  features {
    # Control what happens when a resource group is deleted
    resource_group {
      prevent_deletion_if_contains_resources = true
    }

    # Control key vault behavior
    key_vault {
      # Purge soft-deleted keys, secrets, and certificates on destroy
      purge_soft_delete_on_destroy    = true
      # Recover soft-deleted key vaults instead of failing
      recover_soft_deleted_key_vaults = true
    }

    # Control virtual machine behavior
    virtual_machine {
      # Delete OS disk automatically when deleting the VM
      delete_os_disk_on_deletion     = true
      # Gracefully shutdown the VM before deleting
      graceful_shutdown               = false
      # Skip shutdown and force delete
      skip_shutdown_and_force_delete  = false
    }

    # Log analytics workspace
    log_analytics_workspace {
      # Permanently delete instead of soft delete
      permanently_delete_on_destroy = true
    }

    # API management
    api_management {
      purge_soft_delete_on_destroy = true
      recover_soft_deleted         = true
    }
  }
}
```

These settings have real consequences. For example, if `prevent_deletion_if_contains_resources` is true and you try to delete a resource group that still has resources in it, Terraform will refuse. This prevents accidental deletion of resources you did not realize were in the group.

## Authentication Methods

The AzureRM provider supports several authentication methods. Here is a quick overview:

### Azure CLI Authentication (Development)

The simplest method for local development. No additional configuration needed beyond `az login`:

```hcl
provider "azurerm" {
  features {}
  # Uses credentials from 'az login' automatically
}
```

### Environment Variables

Set credentials via environment variables for CI/CD:

```bash
# Set these environment variables
export ARM_CLIENT_ID="your-app-id"
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_SUBSCRIPTION_ID="your-subscription-id"
export ARM_TENANT_ID="your-tenant-id"
```

```hcl
# No explicit credentials in the provider block
provider "azurerm" {
  features {}
  # Provider reads from ARM_* environment variables
}
```

### Service Principal (Inline)

For situations where environment variables are not practical:

```hcl
provider "azurerm" {
  features {}

  client_id       = var.azure_client_id
  client_secret   = var.azure_client_secret
  tenant_id       = var.azure_tenant_id
  subscription_id = var.azure_subscription_id
}
```

Never hardcode secrets in your Terraform files. Always use variables, and pass them via `TF_VAR_` environment variables or a secrets manager.

For deeper dives into service principal and managed identity authentication, see [How to Configure Azure Provider with Service Principal](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-azure-provider-with-service-principal/view) and [How to Configure Azure Provider with Managed Identity](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-azure-provider-with-managed-identity/view).

## Specifying the Subscription

You can set the subscription in multiple ways:

```hcl
# Method 1: Directly in the provider block
provider "azurerm" {
  features {}
  subscription_id = "12345678-1234-1234-1234-123456789012"
}

# Method 2: Via environment variable (no provider config needed)
# export ARM_SUBSCRIPTION_ID="12345678-1234-1234-1234-123456789012"

# Method 3: Using a variable
variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}
```

## Configuring the Backend

While not strictly part of the provider, most Azure Terraform projects store state in Azure Blob Storage:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}
```

Create the storage account for state before running `terraform init`:

```bash
# Create resource group for state storage
az group create --name terraform-state-rg --location eastus

# Create storage account (name must be globally unique)
az storage account create \
  --name tfstate12345 \
  --resource-group terraform-state-rg \
  --sku Standard_LRS \
  --encryption-services blob

# Create blob container
az storage container create \
  --name tfstate \
  --account-name tfstate12345
```

## Provider Version Pinning

Pin the provider version to avoid breaking changes:

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      # Pin to a specific minor version range
      version = "~> 4.0"
      # Or pin to exact version for maximum stability
      # version = "= 4.14.0"
    }
  }
}
```

The `~> 4.0` constraint allows any 4.x version but blocks 5.0 and above. This gives you bug fixes and new resources while preventing major breaking changes.

## A Complete Production Example

Here is a production-ready provider configuration pulling everything together:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstateprod12345"
    container_name       = "tfstate"
    key                  = "production/main.tfstate"
  }
}

# provider.tf
provider "azurerm" {
  subscription_id = var.subscription_id

  features {
    resource_group {
      prevent_deletion_if_contains_resources = true
    }

    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }

    virtual_machine {
      delete_os_disk_on_deletion = true
    }

    log_analytics_workspace {
      permanently_delete_on_destroy = true
    }
  }
}

# variables.tf
variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}
```

```bash
# Initialize with your subscription
terraform init
terraform plan -var="subscription_id=12345678-1234-1234-1234-123456789012"
```

## Testing Your Configuration

After setting up the provider, verify it works by creating a simple resource group:

```hcl
# test.tf - remove this after verifying
resource "azurerm_resource_group" "test" {
  name     = "test-terraform-rg"
  location = "eastus"

  tags = {
    Environment = "test"
    ManagedBy   = "terraform"
  }
}
```

```bash
terraform init
terraform plan
terraform apply
# Verify in Azure Portal or CLI
az group show --name test-terraform-rg
# Clean up
terraform destroy
```

## Summary

The AzureRM provider requires a few specific configuration steps that differ from other Terraform providers - particularly the mandatory `features {}` block and the various authentication methods. Start with Azure CLI authentication for development, move to service principals or managed identities for CI/CD, and always pin your provider version. The `features` block gives you control over important resource lifecycle behaviors, so take the time to configure it based on your organization's policies.
