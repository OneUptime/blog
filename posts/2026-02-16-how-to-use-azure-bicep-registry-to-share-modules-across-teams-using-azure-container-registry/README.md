# How to Use Azure Bicep Registry to Share Modules Across Teams Using Azure Container Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Bicep, Bicep Registry, Azure Container Registry, Infrastructure as Code, Module Sharing, DevOps, IaC

Description: Learn how to publish, version, and consume reusable Bicep modules through Azure Container Registry to standardize infrastructure patterns across teams.

---

When multiple teams in your organization deploy Azure infrastructure, they end up solving the same problems independently. One team writes a Bicep module for a properly configured storage account. Another team writes their own version with slightly different settings. A third team copies the first team's code into their repository and modifies it. Over time, you end up with dozens of variations of the same infrastructure pattern, each with its own bugs and security gaps.

A Bicep registry solves this by providing a central place to publish and consume Bicep modules. Teams publish their well-tested, security-reviewed modules to the registry, and other teams reference them by version. When a module needs updating, you publish a new version, and consuming teams can upgrade at their own pace.

Azure Container Registry (ACR) serves as the backing store for Bicep module registries. You push modules as OCI artifacts, and Bicep pulls them during deployment. No additional tooling is needed beyond what you already have.

## Setting Up the Registry

First, create an Azure Container Registry to host your Bicep modules. Any ACR tier works, but Standard or Premium is recommended for production use.

```bash
# Create a resource group for the registry
az group create --name "rg-bicep-registry" --location "eastus"

# Create an Azure Container Registry
# The name must be globally unique and alphanumeric
az acr create \
  --resource-group "rg-bicep-registry" \
  --name "myorgbicepregistry" \
  --sku Standard \
  --location "eastus"

# Verify the registry was created
az acr show --name "myorgbicepregistry" --output table
```

## Publishing Your First Module

Let us create a simple Bicep module and publish it to the registry. Here is a module for a standardized storage account with security best practices.

```bicep
// modules/storage-account/main.bicep
// Standardized storage account with organization security requirements

@description('The name of the storage account (must be globally unique)')
param storageAccountName string

@description('The Azure region for the storage account')
param location string = resourceGroup().location

@description('The storage account SKU')
@allowed([
  'Standard_LRS'
  'Standard_GRS'
  'Standard_ZRS'
  'Standard_RAGRS'
])
param skuName string = 'Standard_LRS'

@description('Tags to apply to the storage account')
param tags object = {}

@description('Whether to enable blob versioning')
param enableBlobVersioning bool = true

// Storage account with organization-mandated security settings
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: skuName
  }
  kind: 'StorageV2'
  properties: {
    // Security: require TLS 1.2 minimum
    minimumTlsVersion: 'TLS1_2'
    // Security: disable public blob access
    allowBlobPublicAccess: false
    // Security: require HTTPS
    supportsHttpsTrafficOnly: true
    // Security: enable infrastructure encryption
    encryption: {
      services: {
        blob: { enabled: true }
        file: { enabled: true }
      }
      keySource: 'Microsoft.Storage'
      requireInfrastructureEncryption: true
    }
    // Enable soft delete for data protection
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}

// Enable blob versioning if requested
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    isVersioningEnabled: enableBlobVersioning
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

// Outputs for consuming modules to reference
output storageAccountId string = storageAccount.id
output storageAccountName string = storageAccount.name
output primaryEndpoints object = storageAccount.properties.primaryEndpoints
```

Publish this module to the registry using the Bicep CLI.

```bash
# Publish the storage account module to the registry
# The path format is: br:<registry>.azurecr.io/<module-path>:<version>
az bicep publish \
  --file modules/storage-account/main.bicep \
  --target "br:myorgbicepregistry.azurecr.io/modules/storage-account:1.0.0"

# Publish a newer version with additional features
az bicep publish \
  --file modules/storage-account/main.bicep \
  --target "br:myorgbicepregistry.azurecr.io/modules/storage-account:1.1.0"

# You can also publish with a documentation URI
az bicep publish \
  --file modules/storage-account/main.bicep \
  --target "br:myorgbicepregistry.azurecr.io/modules/storage-account:1.1.0" \
  --documentation-uri "https://wiki.yourcompany.com/bicep-modules/storage-account"
```

## Consuming Modules from the Registry

Other teams reference published modules in their Bicep files using the `br:` prefix.

```bicep
// main.bicep - Consuming modules from the registry
// Teams reference published modules instead of writing their own

@description('Environment name')
param environment string

@description('Azure region')
param location string = resourceGroup().location

// Reference the standardized storage account module from the registry
module appStorage 'br:myorgbicepregistry.azurecr.io/modules/storage-account:1.0.0' = {
  name: 'app-storage-deployment'
  params: {
    storageAccountName: 'st${environment}app${uniqueString(resourceGroup().id)}'
    location: location
    skuName: environment == 'production' ? 'Standard_ZRS' : 'Standard_LRS'
    tags: {
      Environment: environment
      ManagedBy: 'Bicep'
    }
    enableBlobVersioning: true
  }
}

// Use the module outputs
output storageEndpoint string = appStorage.outputs.primaryEndpoints.blob
```

When you run `az deployment group create` with this file, Bicep automatically pulls the module from the registry, validates the parameters, and includes it in the deployment.

## Configuring the bicepconfig.json

To simplify module references and avoid typing the full registry URL every time, configure aliases in `bicepconfig.json`.

```json
{
  "moduleAliases": {
    "br": {
      "myorg": {
        "registry": "myorgbicepregistry.azurecr.io",
        "modulePath": "modules"
      }
    }
  }
}
```

Now module references become much shorter.

```bicep
// With the alias, the reference is cleaner
module appStorage 'br/myorg:storage-account:1.0.0' = {
  name: 'app-storage'
  params: {
    storageAccountName: 'stmyapp'
    location: resourceGroup().location
  }
}
```

## Versioning Strategy

Use semantic versioning for your modules. This gives consumers clear expectations about compatibility.

- Patch versions (1.0.0 to 1.0.1): Bug fixes, no parameter changes
- Minor versions (1.0.0 to 1.1.0): New optional parameters, backward-compatible features
- Major versions (1.0.0 to 2.0.0): Breaking changes, required parameter changes, removed features

```bash
# List all versions of a module in the registry
az acr repository show-tags \
  --name "myorgbicepregistry" \
  --repository "modules/storage-account" \
  --output table
```

## CI/CD Pipeline for Module Publishing

Automate module publishing through a pipeline so that every merge to main publishes a new version.

```yaml
# module-publish-pipeline.yml
# Publishes Bicep modules to ACR when changes are merged to main

trigger:
  branches:
    include:
      - main
  paths:
    include:
      - modules/**

pool:
  vmImage: 'ubuntu-latest'

variables:
  registryName: 'myorgbicepregistry'

steps:
  - checkout: self
    fetchDepth: 0

  # Detect which modules changed
  - script: |
      # Find modules that changed in the last commit
      CHANGED_MODULES=$(git diff --name-only HEAD~1 HEAD -- modules/ | \
        cut -d'/' -f1-2 | sort -u)

      echo "Changed modules:"
      echo "$CHANGED_MODULES"
      echo "##vso[task.setvariable variable=ChangedModules]$CHANGED_MODULES"
    displayName: 'Detect changed modules'

  # Validate all Bicep files
  - script: |
      for module_dir in modules/*/; do
        module_name=$(basename "$module_dir")
        echo "Validating module: $module_name"
        az bicep build --file "${module_dir}main.bicep"
      done
    displayName: 'Validate Bicep modules'

  # Publish changed modules
  - task: AzureCLI@2
    displayName: 'Publish modules to registry'
    inputs:
      azureSubscription: 'Azure-Service-Connection'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        for module_dir in modules/*/; do
          module_name=$(basename "$module_dir")

          # Read version from a version.txt file in the module directory
          if [ -f "${module_dir}version.txt" ]; then
            VERSION=$(cat "${module_dir}version.txt" | tr -d '[:space:]')
          else
            VERSION="0.1.0"
          fi

          echo "Publishing $module_name version $VERSION"

          az bicep publish \
            --file "${module_dir}main.bicep" \
            --target "br:$(registryName).azurecr.io/modules/${module_name}:${VERSION}"

          echo "Published successfully: modules/${module_name}:${VERSION}"
        done
```

## Access Control

Control who can publish and consume modules through ACR's role-based access control.

```bash
# Grant a team read-only access to pull modules (AcrPull role)
az role assignment create \
  --assignee "team-alpha-service-principal-id" \
  --role "AcrPull" \
  --scope "/subscriptions/.../resourceGroups/rg-bicep-registry/providers/Microsoft.ContainerRegistry/registries/myorgbicepregistry"

# Grant the platform team push access to publish modules (AcrPush role)
az role assignment create \
  --assignee "platform-team-service-principal-id" \
  --role "AcrPush" \
  --scope "/subscriptions/.../resourceGroups/rg-bicep-registry/providers/Microsoft.ContainerRegistry/registries/myorgbicepregistry"
```

For local development, developers authenticate to the registry using `az acr login`.

```bash
# Authenticate your local machine to pull modules from the registry
az acr login --name "myorgbicepregistry"

# Now bicep commands can pull modules from the registry
az deployment group create \
  --resource-group "my-rg" \
  --template-file main.bicep
```

## Building a Module Library

As your organization grows, structure your registry with a clear module hierarchy.

```
modules/
  compute/
    virtual-machine/main.bicep
    app-service/main.bicep
    function-app/main.bicep
  networking/
    virtual-network/main.bicep
    application-gateway/main.bicep
    private-endpoint/main.bicep
  data/
    storage-account/main.bicep
    sql-database/main.bicep
    cosmos-db/main.bicep
  security/
    key-vault/main.bicep
    managed-identity/main.bicep
```

Each module encapsulates your organization's best practices, security requirements, and naming conventions. Teams that consume these modules get compliant infrastructure by default, without needing to understand every security setting themselves.

The Bicep registry turns your infrastructure patterns into reusable, versioned, centrally managed building blocks. Instead of every team reinventing the wheel, they compose their infrastructure from modules that have been reviewed, tested, and approved. It is the same principle as shared libraries in application code, applied to infrastructure.
