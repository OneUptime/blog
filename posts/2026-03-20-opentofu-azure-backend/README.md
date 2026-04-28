# How to Configure the Azure Backend (azurerm) in OpenTofu - Opentofu Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Backend, Azure

Description: Learn how to configure the Azure Blob Storage backend (azurerm) in OpenTofu to store state files with built-in locking and versioning.

## Introduction

The `azurerm` backend stores OpenTofu state in Azure Blob Storage. It provides built-in state locking using blob leases and supports state history when blob versioning is enabled on the storage account. This is the standard remote backend for Azure-based infrastructure.

## Prerequisites

- Azure subscription
- Resource group for state storage
- Storage account with a blob container

## Basic Configuration

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "acmecorptofu"
    container_name       = "tfstate"
    key                  = "production.terraform.tfstate"
  }
}
```

## Creating the Required Azure Resources

```hcl
resource "azurerm_resource_group" "tofu_state" {
  name     = "terraform-state-rg"
  location = "East US"
}

resource "azurerm_storage_account" "tofu_state" {
  name                     = "acmecorptofu"
  resource_group_name      = azurerm_resource_group.tofu_state.name
  location                 = azurerm_resource_group.tofu_state.location
  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-redundant storage

  blob_properties {
    versioning_enabled = true  # Enable versioning for state history
  }
}

resource "azurerm_storage_container" "tfstate" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.tofu_state.name
  container_access_type = "private"
}
```

## Authentication with Azure CLI

```bash
# Log in with Azure CLI

az login

# Set the subscription
az account set --subscription "My Subscription"

# OpenTofu will use the CLI credentials automatically
tofu init
```

## Authentication with Environment Variables

```bash
# Service Principal authentication
export ARM_CLIENT_ID="your-client-id"
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_SUBSCRIPTION_ID="your-subscription-id"
export ARM_TENANT_ID="your-tenant-id"

tofu init
```

## Multiple Environments

```hcl
# production/backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "acmecorptofu"
    container_name       = "tfstate"
    key                  = "production.terraform.tfstate"
  }
}

# staging/backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "acmecorptofu"
    container_name       = "tfstate"
    key                  = "staging.terraform.tfstate"
  }
}
```

## Enabling Blob Encryption

Azure Blob Storage encrypts all data at rest automatically using Microsoft-managed keys. For customer-managed keys:

```hcl
resource "azurerm_storage_account" "tofu_state" {
  name                = "acmecorptofu"
  resource_group_name = azurerm_resource_group.tofu_state.name
  location            = azurerm_resource_group.tofu_state.location
  account_tier        = "Standard"
  account_replication_type = "GRS"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.state.id]
  }

  customer_managed_key {
    key_vault_key_id          = azurerm_key_vault_key.state.id
    user_assigned_identity_id = azurerm_user_assigned_identity.state.id
  }
}
```

## IAM Permissions

Assign the `Storage Blob Data Contributor` role:

```bash
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee "your-service-principal-object-id" \
  --scope "/subscriptions/SUB_ID/resourceGroups/terraform-state-rg/providers/Microsoft.Storage/storageAccounts/acmecorptofu"
```

## Conclusion

The Azure Blob Storage backend provides a reliable state store for Azure deployments with built-in locking via blob leases. Create a dedicated resource group and storage account for state, enable versioning for history, and use either Azure CLI or Service Principal credentials for authentication. For team environments, use Managed Identity when running on Azure-hosted compute.
