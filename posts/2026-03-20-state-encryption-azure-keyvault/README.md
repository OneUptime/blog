# How to Configure State Encryption with Azure Key Vault in OpenTofu - Keyvault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Security, Azure, Encryption

Description: Learn how to configure OpenTofu state file encryption using Azure Key Vault for enterprise key management, rotation, and RBAC access control on Azure.

## Introduction

Azure Key Vault provides enterprise-grade key management for OpenTofu state encryption. With Key Vault, you get centralized key management, automatic rotation, detailed audit logs via Azure Monitor, and fine-grained RBAC or access policy control. This guide walks through configuring the Azure Key Vault key provider.

## Step 1: Create an Azure Key Vault and Key

```hcl
# keyvault.tf

resource "azurerm_resource_group" "state" {
  name     = "rg-terraform-state"
  location = "East US"
}

resource "azurerm_key_vault" "terraform_state" {
  name                       = "kv-terraform-state"
  location                   = azurerm_resource_group.state.location
  resource_group_name        = azurerm_resource_group.state.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"

  # Enable soft delete and purge protection
  soft_delete_retention_days = 90
  purge_protection_enabled   = true

  enable_rbac_authorization  = true  # Use RBAC instead of access policies
}

data "azurerm_client_config" "current" {}

# Create a key in the Key Vault
resource "azurerm_key_vault_key" "terraform_state" {
  name         = "terraform-state-key"
  key_vault_id = azurerm_key_vault.terraform_state.id
  key_type     = "RSA"
  key_size     = 4096

  key_opts = [
    "decrypt",
    "encrypt",
    "wrapKey",
    "unwrapKey"
  ]

  # Enable automatic rotation
  rotation_policy {
    automatic {
      time_before_expiry = "P30D"  # Rotate 30 days before expiry
    }

    expire_after         = "P365D"  # Key expires after 1 year
    notify_before_expiry = "P29D"
  }
}
```

## Step 2: Grant Access to Key Vault

```hcl
# Grant the Terraform service principal access to the key
resource "azurerm_role_assignment" "terraform_key_user" {
  scope                = azurerm_key_vault.terraform_state.id
  role_definition_name = "Key Vault Crypto User"
  principal_id         = data.azurerm_client_config.current.object_id
}

# For a service principal
resource "azurerm_role_assignment" "terraform_sp_key_user" {
  scope                = azurerm_key_vault.terraform_state.id
  role_definition_name = "Key Vault Crypto User"
  principal_id         = var.terraform_sp_object_id
}
```

Required role: `Key Vault Crypto User` (allows encrypt/decrypt/wrap/unwrap operations)

For the identity that creates and manages `azurerm_key_vault_key`, use `Key Vault Crypto Officer` or `Key Vault Administrator` so Terraform can create the key and set its rotation policy.

## Step 3: Configure the Azure Key Vault Key Provider

```hcl
# encryption.tf
terraform {
  required_version = ">= 1.11.0"

  encryption {
    key_provider "azure_vault" "state_key" {
      # Key Vault URL
      vault_uri = "https://kv-terraform-state.vault.azure.net/"

      # Key name
      vault_key_name = "terraform-state-key"

      # Generate a 32-byte data encryption key for AES-GCM
      key_length = 32
    }

    method "aes_gcm" "state_method" {
      keys = key_provider.azure_vault.state_key
    }

    state {
      method = method.aes_gcm.state_method
    }

    plan {
      method = method.aes_gcm.state_method
    }
  }
}
```

## Step 4: Configure Azure Authentication

```bash
# Azure CLI authentication (for local development)
az login
az account set --subscription "my-subscription-id"

# Service Principal with client secret
export ARM_CLIENT_ID="00000000-0000-0000-0000-000000000000"
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_TENANT_ID="00000000-0000-0000-0000-000000000000"
export ARM_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"

# Managed Identity (for Azure-hosted runners)
export ARM_USE_MSI=true
export ARM_TENANT_ID="00000000-0000-0000-0000-000000000000"
export ARM_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
```

## Step 5: Using with Azure Backend

Combine Key Vault encryption with the Azure backend:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"
  }

  encryption {
    key_provider "azure_vault" "state_key" {
      vault_uri      = "https://kv-terraform-state.vault.azure.net/"
      vault_key_name = "terraform-state-key"
      key_length     = 32
    }

    method "aes_gcm" "state_method" {
      keys = key_provider.azure_vault.state_key
    }

    state {
      method = method.aes_gcm.state_method
    }
  }
}
```

## Step 6: Monitor Key Vault Access

Enable diagnostics to monitor key usage:

```hcl
resource "azurerm_monitor_diagnostic_setting" "key_vault" {
  name               = "key-vault-diagnostics"
  target_resource_id = azurerm_key_vault.terraform_state.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "AuditEvent"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
```

## Conclusion

Azure Key Vault integration for OpenTofu state encryption provides enterprise-grade security for Azure-based infrastructure. With RBAC authorization, automatic key rotation policies, soft delete protection, and comprehensive audit logging, Key Vault is the recommended encryption backend for any production Azure deployment. Always enable purge protection to prevent accidental key deletion.
