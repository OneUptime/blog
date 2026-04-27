# How to Configure State Encryption with Azure Key Vault in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State, Security, Azure, Encryption

Description: Learn how to configure OpenTofu state encryption using Azure Key Vault to protect state files stored in Azure Blob Storage.

## Introduction

Azure Key Vault as the key provider for OpenTofu state encryption enables envelope encryption with Azure-managed keys. Combined with the azurerm backend, this provides client-side encryption before data reaches Azure Blob Storage - protecting state even if storage access controls are bypassed.

## Configuration

```hcl
# versions.tf

terraform {
  required_version = ">= 1.7"

  encryption {
    key_provider "azure_vault" "main" {
      vault_uri      = "https://my-keyvault.vault.azure.net"
      vault_key_name = "tofu-state-key"
      key_length     = 32
    }

    method "aes_gcm" "main" {
      keys = key_provider.azure_vault.main
    }

    state {
      method = method.aes_gcm.main
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "mytofustate"
    container_name       = "terraform-state"
    key                  = "production.terraform.tfstate"
  }
}
```

## Creating the Key Vault and Key

```hcl
resource "azurerm_key_vault" "tofu_state" {
  name                = "tofu-state-kv"
  location            = azurerm_resource_group.state.location
  resource_group_name = azurerm_resource_group.state.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  purge_protection_enabled = true
}

resource "azurerm_key_vault_key" "state_key" {
  name         = "tofu-state-key"
  key_vault_id = azurerm_key_vault.tofu_state.id
  key_type     = "RSA"
  key_size     = 2048

  key_opts = ["unwrapKey", "wrapKey"]

  rotation_policy {
    automatic {
      time_before_expiry = "P30D"
    }
    expire_after         = "P90D"
    notify_before_expiry = "P29D"
  }
}
```

## Access Policy for Key Vault

```hcl
resource "azurerm_key_vault_access_policy" "tofu" {
  key_vault_id = azurerm_key_vault.tofu_state.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.tofu.principal_id

  key_permissions = [
    "Get",
    "WrapKey",
    "UnwrapKey"
  ]
}
```

## Authentication

```bash
# Service Principal (CI/CD)
export ARM_CLIENT_ID="your-client-id"
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_TENANT_ID="your-tenant-id"
export ARM_SUBSCRIPTION_ID="your-subscription-id"

# Managed Identity (when running on Azure VM/AKS - recommended)
# No credentials needed

# Azure CLI (local development)
az login
```

## Using a Symmetric HSM-Backed Key

```hcl
key_provider "azure_vault" "main" {
  vault_uri          = "https://my-hsm.managedhsm.azure.net/"
  vault_key_name     = "tofu-state-key"
  key_length         = 32
  symmetric          = true
  symmetric_key_size = 256
}
```

## Encrypting Plans

```hcl
state {
  method = method.aes_gcm.main
}

plan {
  method = method.aes_gcm.main
}
```

## Conclusion

Azure Key Vault state encryption integrates with Azure RBAC and Managed Identity, enabling keyless authentication for workloads running on Azure. Enable automatic key rotation via Key Vault rotation policies, use Managed Identity for CI/CD running on AKS or Azure DevOps, and restrict Key Vault access to only the identities that run OpenTofu.
