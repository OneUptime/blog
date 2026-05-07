# How to Configure Azure Managed Identities with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Managed Identity, OpenTofu, Security, IAM, Authentication

Description: Learn how to configure Azure Managed Identities with OpenTofu to enable passwordless authentication for Azure resources accessing other Azure services.

## Overview

Azure Managed Identities eliminate the need to manage credentials by providing Azure resources with an automatically managed identity in Microsoft Entra ID. OpenTofu manages both System-Assigned (tied to a resource lifecycle) and User-Assigned (standalone, reusable) identities.

## Step 1: User-Assigned Managed Identity

```hcl
# main.tf - Create a reusable user-assigned managed identity

resource "azurerm_user_assigned_identity" "app_identity" {
  name                = "my-app-identity"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  tags = {
    purpose = "application-access"
  }
}
```

## Step 2: Assign the Identity to an App Service

```hcl
# Attach the user-assigned identity to an App Service
resource "azurerm_linux_web_app" "app" {
  name                = "my-web-app"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id

  identity {
    type = "UserAssigned"
    # Associate the managed identity with this app
    identity_ids = [azurerm_user_assigned_identity.app_identity.id]
  }

  site_config {}
}
```

## Step 3: System-Assigned Identity on a VM

```hcl
# Virtual Machine with system-assigned identity
resource "azurerm_linux_virtual_machine" "vm" {
  name                = "my-vm"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  size                = "Standard_B2s"
  admin_username      = "azureuser"

  identity {
    # System-assigned: created and deleted with the VM
    type = "SystemAssigned"
  }

  # ... other required VM properties
}
```

## Step 4: Grant Role Assignments to the Identity

```hcl
# Grant the user-assigned identity access to a Key Vault that uses Azure RBAC
resource "azurerm_role_assignment" "identity_kv_reader" {
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app_identity.principal_id
}

# Grant the identity read access to a storage account
resource "azurerm_role_assignment" "identity_storage_reader" {
  scope                = azurerm_storage_account.storage.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_user_assigned_identity.app_identity.principal_id
}

# Grant the VM's system-assigned identity access to read secrets from a Key Vault that uses Azure RBAC
resource "azurerm_role_assignment" "vm_kv_access" {
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_virtual_machine.vm.identity[0].principal_id
}
```

## Step 5: Use Both Identity Types on an App Service

```hcl
# App Service with both system and user-assigned identities
resource "azurerm_linux_web_app" "app_dual_identity" {
  name                = "my-dual-identity-app"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id

  identity {
    type = "SystemAssigned, UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app_identity.id]
  }

  site_config {}
}
```

## Step 6: Outputs

```hcl
output "user_assigned_identity_client_id" {
  value       = azurerm_user_assigned_identity.app_identity.client_id
  description = "Client ID to use in SDK DefaultAzureCredential configuration"
}

output "user_assigned_identity_principal_id" {
  value       = azurerm_user_assigned_identity.app_identity.principal_id
  description = "Object ID for role assignments"
}
```

## Summary

Azure Managed Identities with OpenTofu eliminate credential management by providing Azure resources with automatic identities in Microsoft Entra ID. Use User-Assigned identities when the same identity needs to be shared across multiple resources, and System-Assigned when each resource needs a unique identity tied to its lifecycle.
