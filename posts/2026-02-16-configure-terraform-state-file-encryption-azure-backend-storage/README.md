# How to Configure Terraform State File Encryption for Azure Backend Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, State Management, Encryption, Security, Infrastructure as Code, Cloud Security

Description: Configure Terraform state file encryption using Azure Storage backend with customer-managed keys and access controls for maximum security.

---

Terraform state files are a goldmine for attackers. They contain resource IDs, connection strings, passwords, and sometimes even private keys in plain text. If you are storing your state in Azure Storage, you need to make sure that storage is properly encrypted, access-controlled, and audited. The default Azure Storage encryption is fine as a baseline, but for production workloads with compliance requirements, you likely need customer-managed keys and layered access controls.

This post covers how to set up a secure Azure Storage backend for Terraform state, including encryption with customer-managed keys, network restrictions, and proper IAM configuration.

## The Default Setup and Its Limitations

Most tutorials show you the basics of configuring an Azure Storage backend.

```hcl
# backend.tf
# Basic Azure Storage backend - works but needs security hardening
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate001"
    container_name       = "tfstate"
    key                  = "production.tfstate"
  }
}
```

This works, and Azure Storage does encrypt data at rest by default using Microsoft-managed keys (SSE with platform keys). But you have no control over those keys, no way to audit key usage, and anyone with storage account access can read the state file. Let us fix all of that.

## Creating the Storage Account with Proper Security

Start by creating the storage account itself with all the security settings baked in.

```hcl
# state-infrastructure/main.tf
# This Terraform config creates the secure storage for state files
# Run this once to bootstrap, then store its own state locally or in a different backend

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "state" {
  name     = "rg-terraform-state"
  location = "eastus"
  tags = {
    purpose    = "terraform-state"
    managed_by = "bootstrap"
  }
}

# Storage account with security hardening
resource "azurerm_storage_account" "state" {
  name                            = "stterraformstate001"
  resource_group_name             = azurerm_resource_group.state.name
  location                        = azurerm_resource_group.state.location
  account_tier                    = "Standard"
  account_replication_type        = "GRS"  # Geo-redundant for disaster recovery
  account_kind                    = "StorageV2"
  min_tls_version                 = "TLS1_2"

  # Disable public blob access - state should never be public
  allow_nested_items_to_be_public = false

  # Disable shared key access to force Azure AD authentication
  shared_access_key_enabled       = false

  # Enable infrastructure encryption (double encryption)
  infrastructure_encryption_enabled = true

  # Enable blob soft delete for recovery
  blob_properties {
    delete_retention_policy {
      days = 30
    }
    versioning_enabled = true

    # Keep change feed for audit trail
    change_feed_enabled = true
  }

  # Network rules - restrict access
  network_rules {
    default_action = "Deny"
    ip_rules       = var.allowed_ip_ranges
    bypass         = ["AzureServices"]
  }

  tags = {
    purpose    = "terraform-state"
    encryption = "customer-managed"
  }
}

# Container for state files
resource "azurerm_storage_container" "tfstate" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.state.name
  container_access_type = "private"
}
```

Several things to call out here. Setting `shared_access_key_enabled` to `false` disables storage account key access entirely, forcing all access through Azure AD. The `infrastructure_encryption_enabled` flag adds a second layer of encryption at the infrastructure level with a different algorithm. Blob versioning means you can recover previous state file versions if something goes wrong.

## Setting Up Customer-Managed Keys with Key Vault

For full control over encryption, you need a Key Vault with a customer-managed key (CMK).

```hcl
# Key Vault for storing the encryption key
resource "azurerm_key_vault" "state_encryption" {
  name                       = "kv-tfstate-encrypt"
  location                   = azurerm_resource_group.state.location
  resource_group_name        = azurerm_resource_group.state.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "premium"  # Premium for HSM-backed keys
  soft_delete_retention_days = 90
  purge_protection_enabled   = true  # Required for CMK encryption

  # Enable RBAC for Key Vault access instead of access policies
  enable_rbac_authorization = true

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
    ip_rules       = var.allowed_ip_ranges
  }
}

# Create the encryption key
resource "azurerm_key_vault_key" "state_encryption" {
  name         = "terraform-state-encryption-key"
  key_vault_id = azurerm_key_vault.state_encryption.id
  key_type     = "RSA"
  key_size     = 2048

  key_opts = [
    "decrypt",
    "encrypt",
    "sign",
    "unwrapKey",
    "verify",
    "wrapKey",
  ]

  # Automatic key rotation every 90 days
  rotation_policy {
    automatic {
      time_before_expiry = "P30D"
    }
    expire_after         = "P90D"
    notify_before_expiry = "P29D"
  }
}

# Create a managed identity for the storage account to access Key Vault
resource "azurerm_user_assigned_identity" "storage" {
  name                = "id-terraform-state-storage"
  resource_group_name = azurerm_resource_group.state.name
  location            = azurerm_resource_group.state.location
}

# Grant the managed identity access to the encryption key
resource "azurerm_role_assignment" "storage_key_vault" {
  scope                = azurerm_key_vault.state_encryption.id
  role_definition_name = "Key Vault Crypto Service Encryption User"
  principal_id         = azurerm_user_assigned_identity.storage.principal_id
}

# Configure the storage account to use customer-managed key
resource "azurerm_storage_account_customer_managed_key" "state" {
  storage_account_id        = azurerm_storage_account.state.id
  key_vault_id              = azurerm_key_vault.state_encryption.id
  key_name                  = azurerm_key_vault_key.state_encryption.name
  user_assigned_identity_id = azurerm_user_assigned_identity.storage.id
}
```

With purge protection enabled on the Key Vault, nobody can permanently delete the encryption key, even by accident. The rotation policy ensures the key is rotated automatically, which many compliance frameworks require.

## Configuring RBAC for State Access

Since we disabled shared key access, all Terraform operations need to authenticate via Azure AD. Set up the right RBAC roles.

```hcl
# Role assignments for teams that need state access
# Storage Blob Data Contributor allows reading and writing state files

# CI/CD service principal needs full access
resource "azurerm_role_assignment" "cicd_state_access" {
  scope                = azurerm_storage_account.state.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = var.cicd_service_principal_id
}

# Developers get read-only access to state
resource "azurerm_role_assignment" "dev_state_read" {
  scope                = azurerm_storage_account.state.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = var.developers_group_id
}
```

## Updating the Backend Configuration

With shared key access disabled, you need to tell Terraform to use Azure AD authentication for the backend.

```hcl
# backend.tf
# Updated backend config using Azure AD authentication
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate001"
    container_name       = "tfstate"
    key                  = "production.tfstate"

    # Use Azure AD instead of storage account keys
    use_azuread_auth = true
  }
}
```

When running Terraform, authenticate with Azure CLI or a service principal. The backend will use your Azure AD identity to access the storage account.

```bash
# Login to Azure with your identity
az login

# Initialize Terraform with the secure backend
terraform init
```

## Enabling Audit Logging

To maintain a full audit trail of who accessed or modified state files, enable diagnostic logging on both the storage account and Key Vault.

```hcl
# Diagnostic settings for the storage account
resource "azurerm_monitor_diagnostic_setting" "storage_audit" {
  name                       = "state-storage-audit"
  target_resource_id         = "${azurerm_storage_account.state.id}/blobServices/default"
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "StorageRead"
  }
  enabled_log {
    category = "StorageWrite"
  }
  enabled_log {
    category = "StorageDelete"
  }

  metric {
    category = "Transaction"
    enabled  = true
  }
}

# Diagnostic settings for Key Vault
resource "azurerm_monitor_diagnostic_setting" "keyvault_audit" {
  name                       = "keyvault-audit"
  target_resource_id         = azurerm_key_vault.state_encryption.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "AuditEvent"
  }
}
```

## State File Locking

Azure Storage supports blob leasing, which Terraform uses for state locking. This prevents two people from running Terraform at the same time and corrupting the state. This works automatically with the `azurerm` backend. No additional configuration is needed. But if you run into lock issues, you can inspect and break locks.

```bash
# Check if a state file is locked
az storage blob show \
  --account-name stterraformstate001 \
  --container-name tfstate \
  --name production.tfstate \
  --auth-mode login \
  --query properties.lease

# Break a stuck lock (use with caution)
terraform force-unlock LOCK_ID
```

## Summary

Securing Terraform state on Azure requires multiple layers. Start with a properly configured storage account that disables public access and shared key authentication. Add customer-managed encryption keys through Key Vault with automatic rotation. Use RBAC to control who can read and write state files. Enable blob versioning and soft delete for recovery. Finally, set up diagnostic logging so you have a complete audit trail. This setup meets most compliance requirements and protects your state files from both accidental exposure and intentional attacks.
