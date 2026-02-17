# How to Configure Azure Bicep Modules Registry Using Azure Container Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Bicep, Container Registry, Modules, Infrastructure as Code, DevOps, Module Registry

Description: Configure a private Bicep module registry using Azure Container Registry to share and version reusable infrastructure templates across teams.

---

One of the biggest challenges with infrastructure as code at scale is sharing reusable components across teams. Every team ends up writing their own storage account module, their own network security group template, and their own Key Vault configuration. Azure Bicep modules solve the reusability problem, and Azure Container Registry (ACR) serves as a private registry for storing and versioning those modules.

This post covers setting up ACR as a Bicep module registry, publishing modules, versioning them properly, and consuming them from other Bicep templates.

## Why Use a Module Registry

Before Bicep registries, sharing modules meant copying files between repositories, using git submodules, or relying on template specs. All of these approaches have friction. A module registry gives you proper versioning (semantic versioning support), access control through Azure RBAC, and a central location that any team can pull from.

The flow is simple: teams build and test their modules, publish them to the registry with a version tag, and consumers reference specific versions in their Bicep files. Breaking changes in a module do not affect consumers until they explicitly update their version reference.

## Setting Up Azure Container Registry

First, create the ACR instance that will serve as your module registry. You do not need a premium tier for Bicep modules - Basic or Standard works fine.

```bicep
// registry-setup.bicep
// Creates an Azure Container Registry for hosting Bicep modules

@description('The location for the registry')
param location string = resourceGroup().location

@description('The name of the container registry - must be globally unique')
param registryName string = 'acrbicepmodules001'

// ACR instance for Bicep module storage
resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: registryName
  location: location
  sku: {
    name: 'Standard'  // Standard is sufficient for module hosting
  }
  properties: {
    adminUserEnabled: false  // Use Azure AD auth, not admin credentials
    publicNetworkAccess: 'Enabled'  // Enable for module pulls from CI/CD
    policies: {
      retentionPolicy: {
        status: 'enabled'
        days: 90  // Retain untagged manifests for 90 days
      }
    }
  }
  tags: {
    purpose: 'bicep-module-registry'
    managed_by: 'platform-team'
  }
}

output registryLoginServer string = registry.properties.loginServer
output registryId string = registry.id
```

Deploy this with the Azure CLI.

```bash
# Create the resource group and deploy the registry
az group create --name rg-bicep-registry --location eastus

az deployment group create \
  --resource-group rg-bicep-registry \
  --template-file registry-setup.bicep \
  --parameters registryName='acrbicepmodules001'
```

## Setting Up RBAC

You need to grant appropriate roles to teams. Module publishers need push access, and consumers need pull access.

```bash
# Grant the platform team push and pull access (AcrPush includes pull)
az role assignment create \
  --assignee "platform-team-group-id" \
  --role "AcrPush" \
  --scope "/subscriptions/{sub-id}/resourceGroups/rg-bicep-registry/providers/Microsoft.ContainerRegistry/registries/acrbicepmodules001"

# Grant all developers pull-only access for consuming modules
az role assignment create \
  --assignee "developers-group-id" \
  --role "AcrPull" \
  --scope "/subscriptions/{sub-id}/resourceGroups/rg-bicep-registry/providers/Microsoft.ContainerRegistry/registries/acrbicepmodules001"

# Grant CI/CD service principal push access for automated publishing
az role assignment create \
  --assignee "cicd-service-principal-id" \
  --role "AcrPush" \
  --scope "/subscriptions/{sub-id}/resourceGroups/rg-bicep-registry/providers/Microsoft.ContainerRegistry/registries/acrbicepmodules001"
```

## Creating a Reusable Module

Let us create a storage account module that enforces organizational standards. This is the kind of module that benefits from being shared.

```bicep
// modules/storage-account/main.bicep
// Standardized storage account module with security defaults

@description('The name of the storage account')
param storageAccountName string

@description('The location for the storage account')
param location string = resourceGroup().location

@description('The storage account tier')
@allowed([
  'Standard'
  'Premium'
])
param accountTier string = 'Standard'

@description('The replication strategy')
@allowed([
  'LRS'
  'GRS'
  'ZRS'
  'RAGRS'
])
param replicationType string = 'GRS'

@description('Tags to apply to the storage account')
param tags object = {}

@description('Enable blob versioning')
param enableVersioning bool = true

// The storage account with organizational security standards baked in
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: '${accountTier}_${replicationType}'
  }
  properties: {
    // Security defaults that every storage account should have
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
    allowSharedKeyAccess: false  // Force Azure AD auth

    // Network defaults
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }

    // Encryption defaults
    encryption: {
      services: {
        blob: { enabled: true, keyType: 'Account' }
        file: { enabled: true, keyType: 'Account' }
        table: { enabled: true, keyType: 'Account' }
        queue: { enabled: true, keyType: 'Account' }
      }
      keySource: 'Microsoft.Storage'
    }
  }
  tags: union(tags, {
    'module-version': '1.0.0'
    'module-source': 'bicep-registry'
  })
}

// Enable blob versioning and soft delete
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    isVersioningEnabled: enableVersioning
    deleteRetentionPolicy: {
      enabled: true
      days: 30
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 30
    }
  }
}

// Outputs for consumers
output storageAccountId string = storageAccount.id
output storageAccountName string = storageAccount.name
output primaryBlobEndpoint string = storageAccount.properties.primaryEndpoints.blob
```

## Publishing Modules to the Registry

Use the Bicep CLI to publish modules to ACR.

```bash
# Login to Azure first
az login

# Publish the storage account module with version 1.0.0
az bicep publish \
  --file modules/storage-account/main.bicep \
  --target "br:acrbicepmodules001.azurecr.io/modules/storage-account:1.0.0"

# Publish a new version with improvements
az bicep publish \
  --file modules/storage-account/main.bicep \
  --target "br:acrbicepmodules001.azurecr.io/modules/storage-account:1.1.0"

# You can also publish with a latest tag for convenience
az bicep publish \
  --file modules/storage-account/main.bicep \
  --target "br:acrbicepmodules001.azurecr.io/modules/storage-account:latest"
```

## Consuming Modules from the Registry

Now any team can consume the module by referencing it from the registry.

```bicep
// deploy.bicep
// Consumes the storage account module from the private registry

@description('Environment name used for resource naming')
param environment string = 'production'

// Reference the module from the registry with a specific version
module appStorage 'br:acrbicepmodules001.azurecr.io/modules/storage-account:1.0.0' = {
  name: 'deploy-app-storage'
  params: {
    storageAccountName: 'stapp${environment}001'
    location: resourceGroup().location
    replicationType: environment == 'production' ? 'GRS' : 'LRS'
    enableVersioning: true
    tags: {
      environment: environment
      application: 'web-app'
    }
  }
}

// Use the module outputs
output storageEndpoint string = appStorage.outputs.primaryBlobEndpoint
```

## Configuring bicepconfig.json for Registry Aliases

Typing the full registry URL every time is verbose. Use `bicepconfig.json` to create aliases.

```json
{
  "moduleAliases": {
    "br": {
      "modules": {
        "registry": "acrbicepmodules001.azurecr.io",
        "modulePath": "modules"
      }
    }
  }
}
```

Now you can reference modules with a shorter syntax.

```bicep
// Before: full registry URL
module storage 'br:acrbicepmodules001.azurecr.io/modules/storage-account:1.0.0' = { ... }

// After: using the alias
module storage 'br/modules:storage-account:1.0.0' = { ... }
```

## CI/CD Pipeline for Module Publishing

Automate module publishing with a pipeline that publishes on merge to main.

```yaml
# .github/workflows/publish-modules.yml
name: Publish Bicep Modules

on:
  push:
    branches: [main]
    paths:
      - 'modules/**'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Install Bicep CLI
        run: az bicep install

      # Detect which modules changed and publish only those
      - name: Publish Changed Modules
        run: |
          REGISTRY="acrbicepmodules001.azurecr.io"

          # Get list of changed module directories
          changed_modules=$(git diff --name-only HEAD~1 HEAD -- modules/ | \
            awk -F'/' '{print $2}' | sort -u)

          for module in $changed_modules; do
            if [ -f "modules/$module/main.bicep" ]; then
              # Read version from metadata file
              version=$(cat "modules/$module/version.txt")
              echo "Publishing $module version $version"

              az bicep publish \
                --file "modules/$module/main.bicep" \
                --target "br:${REGISTRY}/modules/${module}:${version}"
            fi
          done
```

## Module Versioning Strategy

Use semantic versioning for your modules. Patch versions for bug fixes, minor versions for backward-compatible additions, and major versions for breaking changes. Keep a `version.txt` file in each module directory and update it as part of your pull request process.

This approach gives consumers confidence that updating from 1.0.0 to 1.1.0 will not break their deployment, while a jump to 2.0.0 signals they need to review changes.

## Summary

Using Azure Container Registry as a Bicep module registry brings proper software engineering practices to infrastructure code. You get versioned, reusable modules with access control, a central catalog of organizational standards, and the ability to update modules independently from the teams that consume them. The setup takes maybe an hour, but the time savings across an organization are substantial. Every team that no longer needs to write their own storage account template from scratch is time well spent.
