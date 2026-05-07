# How to Configure Azure Key Vault Access Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Key Vault, Access Policies, OpenTofu, Security, IAM

Description: Learn how to configure Azure Key Vault access policies with OpenTofu to control which identities can read, write, and manage secrets, keys, and certificates.

## Overview

Azure Key Vault supports access policies to control which users, applications, and services can perform operations on secrets, keys, and certificates. In this legacy permission model, OpenTofu manages these policies as code, ensuring consistent and auditable access control.

## Step 1: Create Key Vault

```hcl
# main.tf - Key Vault with access policy model

data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "kv" {
  name                        = "my-app-key-vault"
  location                    = azurerm_resource_group.rg.location
  resource_group_name         = azurerm_resource_group.rg.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"
  soft_delete_retention_days  = 90
  purge_protection_enabled    = false

  # Use Key Vault access policies (legacy model, not Azure RBAC)
  rbac_authorization_enabled = false
}
```

## Step 2: Grant Admin Access to Current User/Service Principal

```hcl
# Administrative access for common key, secret, and certificate operations
resource "azurerm_key_vault_access_policy" "admin_policy" {
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  key_permissions = [
    "Get", "List", "Create", "Update", "Delete",
    "Import", "Backup", "Restore", "Recover", "Purge",
  ]

  secret_permissions = [
    "Get", "List", "Set", "Delete", "Backup", "Restore", "Recover", "Purge",
  ]

  certificate_permissions = [
    "Get", "List", "Create", "Update", "Delete", "Import",
    "Backup", "Restore", "Recover", "Purge", "ManageContacts",
  ]
}
```

## Step 3: Grant Application Read-Only Secret Access

```hcl
# Application service principal - read secrets only
resource "azurerm_key_vault_access_policy" "app_policy" {
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = var.app_service_principal_object_id

  secret_permissions = [
    "Get",   # Read a specific secret
    "List",  # List secret names
  ]

  # No key or certificate permissions for this application
}
```

## Step 4: Grant Managed Identity Access

```hcl
# Azure Linux Web App managed identity - get secrets
resource "azurerm_key_vault_access_policy" "app_service_policy" {
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_web_app.app.identity[0].principal_id

  secret_permissions = [
    "Get",
  ]

  key_permissions = [
    "Get",
    "UnwrapKey",
    "WrapKey",
  ]
}
```

## Step 5: Multiple Access Policies with for_each

```hcl
# Define access policies for multiple identities
variable "kv_access_policies" {
  type = map(object({
    object_id           = string
    secret_permissions  = list(string)
    key_permissions     = list(string)
  }))
}

resource "azurerm_key_vault_access_policy" "policies" {
  for_each = var.kv_access_policies

  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = each.value.object_id

  secret_permissions = each.value.secret_permissions
  key_permissions    = each.value.key_permissions
}
```

## Step 6: Outputs

```hcl
output "key_vault_uri" {
  value       = azurerm_key_vault.kv.vault_uri
  description = "Key Vault URI for SDK configuration"
}
```

## Summary

Azure Key Vault access policies managed with OpenTofu ensure only authorized identities can access secrets, keys, and certificates when you opt into the access policy permission model. Using the `for_each` pattern for access policies makes it easy to manage permissions for multiple identities while keeping the configuration DRY and version-controlled.
