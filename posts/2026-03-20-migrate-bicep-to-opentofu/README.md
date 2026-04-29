# How to Migrate Azure Infrastructure from Bicep to OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Bicep, Azure, Migration, Infrastructure as Code

Description: Learn how to migrate Azure infrastructure managed by Bicep files into OpenTofu without recreating resources.

## Introduction

Bicep is Azure's domain-specific language that compiles to ARM templates. While Bicep is more readable than raw ARM JSON, it remains Azure-only. Migrating to OpenTofu gives your team a multi-cloud capable IaC tool with richer module ecosystems, testing frameworks, and community tooling. The migration can import existing resources without recreating them, as long as the OpenTofu configuration matches what is already deployed.

## Phase 1: Understand Your Bicep Deployment

Audit existing Bicep deployments.

```bash
# List current deployments

az deployment group list \
  --resource-group myapp-prod-rg \
  --output table

# Decompile an ARM template back to Bicep for reference (if needed)
az bicep decompile --file exported.json

# List all resources in the resource group
az resource list \
  --resource-group myapp-prod-rg \
  --query '[*].[type,name,id]' \
  --output table
```

## Phase 2: Translate Bicep to HCL

Map Bicep syntax to OpenTofu HCL. The azurerm provider covers many common Azure resources, and the AzAPI provider can fill gaps for unsupported or preview resource types.

```bicep
// Bicep (original)
param location string = resourceGroup().location
param storageAccountName string

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
}
```

```hcl
# OpenTofu equivalent
variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "storage_account_name" {
  type = string
}

resource "azurerm_storage_account" "main" {
  name                       = var.storage_account_name
  resource_group_name        = var.resource_group_name
  location                   = var.location
  account_tier               = "Standard"
  account_replication_type   = "LRS"
  account_kind               = "StorageV2"
  access_tier                = "Hot"
  https_traffic_only_enabled = true
  min_tls_version            = "TLS1_2"
}
```

## Bicep to OpenTofu Concept Mapping

```text
Bicep                    → OpenTofu
--------------------------------------------
param                    → variable
var (Bicep)              → locals
output                   → output
resource declaration     → resource block
module (Bicep)           → module block
dependsOn               → depends_on
resourceGroup().location → var.location (pass as variable)
existing resource        → data source or imported resource
@secure() decorator     → sensitive = true on variable
```

## Phase 3: Import Existing Resources

Use import blocks with the full Azure resource ID.

```hcl
# imports.tf

import {
  id = "/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/myapp-prod-rg/providers/Microsoft.Storage/storageAccounts/myappprodstorage"
  to = azurerm_storage_account.main
}

import {
  id = "/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/myapp-prod-rg/providers/Microsoft.Web/serverfarms/myapp-prod-asp"
  to = azurerm_service_plan.main
}

import {
  id = "/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/myapp-prod-rg/providers/Microsoft.Web/sites/myapp-prod-web"
  to = azurerm_linux_web_app.main
}
```

```bash
# Get the resource ID
az storage account show \
  --name myappprodstorage \
  --resource-group myapp-prod-rg \
  --query id -o tsv

tofu init
tofu plan    # review the import actions and verify there are no destructive changes
tofu apply   # import resources into state
```

## Phase 4: Handle Bicep Modules

Bicep modules map to OpenTofu modules with some adjustments.

```bicep
// Bicep module call
module storageModule './storage.bicep' = {
  name: 'storageDeployment'
  params: {
    name: storageAccountName
    location: location
  }
}
```

```hcl
# OpenTofu module call
module "storage" {
  source   = "./modules/storage"
  name     = var.storage_account_name
  location = var.location
}
```

## Phase 5: Validate and Clean Up

Verify the migration and remove Bicep deployment history entries.

```bash
# Plan should show no changes if config matches reality
tofu plan

# Delete the deployment history entry (resources are retained)
az deployment group delete \
  --resource-group myapp-prod-rg \
  --name myapp-bicep-deployment

# Archive your Bicep files in version control
# They are no longer the source of truth
git mv infra/bicep infra/bicep-archived
git commit -m "Archive Bicep files - migrated to OpenTofu"
```

## Summary

Migrating from Bicep to OpenTofu follows the same pattern as ARM migration: translate the Bicep configuration to HCL, import existing resources using their Azure resource IDs, validate with `tofu plan`, and archive the Bicep files. The translation is straightforward because Bicep and HCL share similar structural concepts (params → variables, outputs → outputs, modules → modules). After migration, your Azure infrastructure can be managed alongside GCP and AWS resources in a single OpenTofu configuration.
