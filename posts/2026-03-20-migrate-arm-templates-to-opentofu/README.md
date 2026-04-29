# How to Migrate Azure Infrastructure from ARM Templates to OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, ARM Templates, Azure, Migration, Infrastructure as Code

Description: Learn how to migrate existing Azure infrastructure managed by ARM templates into OpenTofu state without recreating resources.

## Introduction

Azure Resource Manager (ARM) templates are JSON-based infrastructure definitions for deploying Azure resources. Migrating to OpenTofu gives you a more readable HCL syntax with better module reuse and testing capabilities. The migration process can import existing resources into state without recreating them, but you should still validate the plan carefully before applying changes.

## Phase 1: Inventory ARM Deployments

Audit what is currently managed by ARM templates.

```bash
# List all resource groups

az group list --query '[*].name' -o tsv

# List deployments in a resource group
az deployment group list \
  --resource-group myapp-prod-rg \
  --query '[*].[name,properties.provisioningState]' \
  --output table

# Export an ARM template from an existing deployment
az deployment group export \
  --resource-group myapp-prod-rg \
  --name myapp-deployment \
  > exported-template.json

# List all resources in a resource group
az resource list \
  --resource-group myapp-prod-rg \
  --query '[*].[type,name,id]' \
  --output table
```

## Phase 2: Write OpenTofu Configuration

Translate ARM template resources to HCL. Use the azurerm provider documentation.

```json
// ARM Template (original)
{
  "type": "Microsoft.Storage/storageAccounts",
  "apiVersion": "2023-05-01",
  "name": "[parameters('storageAccountName')]",
  "location": "[resourceGroup().location]",
  "sku": { "name": "Standard_LRS" },
  "kind": "StorageV2",
  "properties": {}
}
```

```hcl
# OpenTofu equivalent
resource "azurerm_resource_group" "main" {
  name     = "myapp-prod-rg"
  location = "eastus"
}

resource "azurerm_storage_account" "app" {
  name                     = "myappprodstorage"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"
}
```

## Phase 3: Import Existing Resources

Import Azure resources using their full resource IDs. Define a matching resource block for each import target before planning the import.

```hcl
# imports.tf

import {
  # Use the full Azure resource ID
  id = "/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/myapp-prod-rg/providers/Microsoft.Storage/storageAccounts/myappprodstorage"
  to = azurerm_storage_account.app
}

import {
  id = "/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/myapp-prod-rg"
  to = azurerm_resource_group.main
}
```

```bash
# Get the resource ID for any Azure resource
az storage account show \
  --name myappprodstorage \
  --resource-group myapp-prod-rg \
  --query id -o tsv

# Preview the import
tofu init
tofu plan

# Import the resources into state
tofu apply

# Confirm the imported configuration is in sync
tofu plan  # should show: No changes
```

## Phase 4: Translating ARM Concepts

Map ARM template concepts to OpenTofu equivalents.

```text
ARM Template         -> OpenTofu equivalent
-------------------------------------------
parameters           -> variable blocks
variables            -> locals
outputs              -> output blocks
resources            -> resource blocks
dependsOn            -> depends_on meta-argument
[resourceGroup()]    -> azurerm_resource_group.main.<attr> / data.azurerm_resource_group.main.<attr>
[parameters('x')]    -> var.x
[concat(a, b)]       -> "${a}${b}"
[resourceId(...)]    -> resource.id / data.<type>.<name>.id
copyIndex()          -> count.index or for_each
```

## Phase 5: Handle ARM-Specific Patterns

Some ARM patterns require special handling.

```hcl
# ARM linked templates → OpenTofu modules
module "networking" {
  source              = "./modules/networking"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
}

# ARM copy loops → for_each
locals {
  environments = toset(["dev", "staging", "prod"])
}

resource "azurerm_storage_account" "env" {
  for_each = local.environments

  name                     = "myapp${each.key}storage"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

## Phase 6: Decommission ARM Deployments

After successful import and validation, remove ARM deployments.

```bash
# Verify tofu plan shows no changes
tofu plan  # should show: No changes

# Delete the ARM deployment record (not the resources)
az deployment group delete \
  --resource-group myapp-prod-rg \
  --name myapp-deployment

# The resources continue to exist and are now managed by OpenTofu
```

## Summary

Migrating from ARM templates to OpenTofu follows a structured import-then-decommission workflow. The key steps are: inventory all ARM deployments, write HCL configuration matching your existing resources, use import blocks with Azure resource IDs, apply the import, validate with `tofu plan` (no changes expected after the import completes), and delete the ARM deployment records. Once migrated, you gain HCL readability, module reuse, reusable OpenTofu workflows, and OpenTofu's advanced testing capabilities.
