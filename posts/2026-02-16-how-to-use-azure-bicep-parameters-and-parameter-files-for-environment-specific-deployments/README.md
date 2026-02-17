# How to Use Azure Bicep Parameters and Parameter Files for Environment-Specific Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Bicep, Parameters, Infrastructure as Code, Azure Deployments, DevOps, CI/CD, ARM

Description: Master Bicep parameters and parameter files to deploy the same infrastructure template across dev, staging, and production with environment-specific configurations.

---

One of the core principles of infrastructure as code is writing your template once and deploying it across multiple environments. You should not have separate Bicep files for dev, staging, and production. Instead, you write one template and use parameters to control what changes between environments - the VM size, the number of replicas, the storage tier, and so on.

Bicep provides several mechanisms for handling parameters: inline parameter declarations, parameter files, decorators for validation, and even conditional logic based on parameter values. This guide covers all of them with practical examples.

## Basic Parameter Declaration

Parameters in Bicep are declared with the `param` keyword. Each parameter has a name, a type, and optionally a default value:

```bicep
// basic-parameters.bicep - demonstrating parameter types
param appName string                    // Required string, no default
param location string = resourceGroup().location  // String with default
param instanceCount int = 1            // Integer with default
param enableDiagnostics bool = false   // Boolean with default
param tags object = {}                 // Object with empty default
param allowedIPs array = []            // Array with empty default
```

When deploying, you provide values for required parameters and optionally override defaults:

```bash
# Deploy with inline parameters
az deployment group create \
  --resource-group "rg-myapp-dev" \
  --template-file "main.bicep" \
  --parameters appName="myapp" instanceCount=2 enableDiagnostics=true
```

## Parameter Decorators

Bicep decorators add validation and metadata to parameters. They catch configuration errors at deployment time rather than at runtime.

```bicep
// Constrain parameter values with decorators

// Only allow specific values
@allowed([
  'dev'
  'staging'
  'production'
])
param environmentName string

// Constrain string length
@minLength(3)
@maxLength(24)
@description('Name of the storage account. Must be globally unique.')
param storageAccountName string

// Constrain numeric ranges
@minValue(1)
@maxValue(10)
@description('Number of app service instances to run')
param instanceCount int = 1

// Mark a parameter as sensitive (will not appear in logs)
@secure()
@description('SQL administrator password')
param sqlAdminPassword string

// Provide metadata for the deployment UI
@metadata({
  example: 'Standard_D4s_v3'
  note: 'Must be a v3 or v5 series for premium storage support'
})
param vmSize string = 'Standard_D2s_v3'
```

The `@secure()` decorator is particularly important. It tells Azure to treat the parameter value as a secret - it will not appear in deployment logs, template exports, or the Azure portal deployment details.

## Parameter Files

For environment-specific configurations, parameter files are the standard approach. A parameter file is a JSON file that provides values for all or some of the template parameters.

### Bicep Parameter Files (.bicepparam)

Bicep now supports its own parameter file format, which is cleaner than the JSON format:

```bicep
// parameters.dev.bicepparam - Development environment parameters
using './main.bicep'

param environmentName = 'dev'
param appName = 'myapp-dev'
param instanceCount = 1
param skuName = 'B1'
param enableDiagnostics = false
param tags = {
  environment: 'dev'
  team: 'engineering'
  costCenter: 'CC-1234'
}
```

```bicep
// parameters.staging.bicepparam - Staging environment parameters
using './main.bicep'

param environmentName = 'staging'
param appName = 'myapp-staging'
param instanceCount = 2
param skuName = 'P1v3'
param enableDiagnostics = true
param tags = {
  environment: 'staging'
  team: 'engineering'
  costCenter: 'CC-1234'
}
```

```bicep
// parameters.production.bicepparam - Production environment parameters
using './main.bicep'

param environmentName = 'production'
param appName = 'myapp-prod'
param instanceCount = 3
param skuName = 'P2v3'
param enableDiagnostics = true
param tags = {
  environment: 'production'
  team: 'engineering'
  costCenter: 'CC-1234'
}
```

Deploy using a parameter file:

```bash
# Deploy to dev using the dev parameter file
az deployment group create \
  --resource-group "rg-myapp-dev" \
  --template-file "main.bicep" \
  --parameters "parameters.dev.bicepparam"

# Deploy to production using the production parameter file
az deployment group create \
  --resource-group "rg-myapp-prod" \
  --template-file "main.bicep" \
  --parameters "parameters.production.bicepparam"
```

### JSON Parameter Files

The traditional JSON format is still widely used and supported:

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "environmentName": {
            "value": "production"
        },
        "appName": {
            "value": "myapp-prod"
        },
        "instanceCount": {
            "value": 3
        },
        "skuName": {
            "value": "P2v3"
        },
        "enableDiagnostics": {
            "value": true
        },
        "tags": {
            "value": {
                "environment": "production",
                "team": "engineering",
                "costCenter": "CC-1234"
            }
        }
    }
}
```

### Referencing Key Vault Secrets in Parameter Files

For sensitive values like passwords, you can reference Azure Key Vault secrets directly in JSON parameter files:

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "sqlAdminPassword": {
            "reference": {
                "keyVault": {
                    "id": "/subscriptions/{sub-id}/resourceGroups/rg-shared/providers/Microsoft.KeyVault/vaults/kv-secrets"
                },
                "secretName": "sql-admin-password"
            }
        }
    }
}
```

This way, the secret never appears in your parameter file or source control.

## A Complete Example

Here is a full Bicep template that deploys differently based on environment parameters:

```bicep
// main.bicep - multi-environment infrastructure template

@allowed([
  'dev'
  'staging'
  'production'
])
param environmentName string

param appName string
param location string = resourceGroup().location

@minValue(1)
@maxValue(10)
param instanceCount int = 1

param skuName string = 'B1'
param enableDiagnostics bool = false
param tags object = {}

@secure()
param sqlAdminPassword string

// Determine SKU settings based on environment
var sqlSkuName = environmentName == 'production' ? 'S2' : 'S0'
var sqlBackupRetentionDays = environmentName == 'production' ? 35 : 7
var resourcePrefix = '${appName}-${environmentName}'

// App Service Plan - scales with environment
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'asp-${resourcePrefix}'
  location: location
  tags: tags
  sku: {
    name: skuName
    capacity: instanceCount
  }
  properties: {
    reserved: true
  }
}

// Web App
resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: 'app-${resourcePrefix}'
  location: location
  tags: tags
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|8.0'
      minTlsVersion: '1.2'
      alwaysOn: skuName != 'B1'  // AlwaysOn not supported on Basic tier
    }
  }
  identity: {
    type: 'SystemAssigned'
  }
}

// SQL Server
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: 'sql-${resourcePrefix}'
  location: location
  tags: tags
  properties: {
    administratorLogin: 'sqladmin'
    administratorLoginPassword: sqlAdminPassword
    minimalTlsVersion: '1.2'
  }
}

// SQL Database with environment-appropriate SKU
resource sqlDb 'Microsoft.Sql/servers/databases@2023-05-01-preview' = {
  parent: sqlServer
  name: 'db-${appName}'
  location: location
  tags: tags
  sku: {
    name: sqlSkuName
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
  }
}

// Diagnostic settings - only deployed when enabled
resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (enableDiagnostics) {
  name: 'diag-${resourcePrefix}'
  scope: webApp
  properties: {
    logs: [
      {
        category: 'AppServiceHTTPLogs'
        enabled: true
        retentionPolicy: {
          days: sqlBackupRetentionDays
          enabled: true
        }
      }
    ]
  }
}

// Outputs
output webAppName string = webApp.name
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
```

## Using Parameters in Azure Pipelines

Here is a pipeline that deploys to multiple environments using different parameter files:

```yaml
# Multi-environment deployment pipeline
trigger:
  - main

parameters:
  - name: environment
    displayName: 'Target Environment'
    type: string
    default: 'dev'
    values:
      - dev
      - staging
      - production

variables:
  resourceGroup: 'rg-myapp-${{ parameters.environment }}'

stages:
  - stage: Deploy
    displayName: 'Deploy to ${{ parameters.environment }}'
    jobs:
      - deployment: DeployInfra
        environment: '${{ parameters.environment }}'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: '${{ parameters.environment }}-connection'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      az deployment group create \
                        --resource-group "$(resourceGroup)" \
                        --template-file "infra/main.bicep" \
                        --parameters "infra/parameters.${{ parameters.environment }}.bicepparam"
                  displayName: 'Deploy infrastructure'
```

## Best Practices for Parameter Management

1. **Use parameter files for each environment.** Keep them in source control alongside the templates. Name them consistently: `parameters.dev.bicepparam`, `parameters.staging.bicepparam`, `parameters.production.bicepparam`.

2. **Never put secrets in parameter files.** Use Key Vault references for JSON parameter files or pipeline variables for sensitive values.

3. **Set sensible defaults for development.** Make your template deployable to a dev environment with minimal parameter overrides. This makes it easy for developers to test infrastructure changes.

4. **Use decorators for validation.** The `@allowed`, `@minLength`, `@maxLength`, `@minValue`, and `@maxValue` decorators catch errors early.

5. **Prefer computed values over parameters.** If a value can be derived from other parameters, compute it in a variable instead of making it a separate parameter. Fewer parameters mean less room for configuration errors.

6. **Document your parameters.** Use the `@description` decorator on every parameter. This description appears in the Azure portal deployment UI and helps anyone deploying the template understand what each value controls.

## Wrapping Up

Parameters are the mechanism that makes a single Bicep template work across multiple environments. Combined with parameter files, you get a clean separation between your infrastructure definition and the environment-specific configuration. The key is to parameterize the things that genuinely differ between environments - SKU sizes, instance counts, feature flags - while keeping everything else as computed values or hardcoded defaults. This keeps your parameter files small and your templates maintainable.
