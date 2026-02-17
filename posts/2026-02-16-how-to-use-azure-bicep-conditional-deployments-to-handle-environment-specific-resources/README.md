# How to Use Azure Bicep Conditional Deployments to Handle Environment-Specific Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Bicep, Conditional Deployments, Infrastructure as Code, Azure DevOps, DevOps, Cloud Infrastructure

Description: Use Bicep conditional expressions to deploy different resources based on environment, feature flags, and configuration parameters in a single template.

---

Not every environment needs the same resources. Production gets a Redis cache, a CDN, and geo-redundant storage. Development gets the cheapest options with no redundancy. Staging might get something in between. Without conditional logic, you would need separate Bicep templates for each environment, which defeats the purpose of infrastructure as code.

Bicep supports conditional deployments through the `if` keyword and ternary expressions. This guide covers how to use them effectively, from simple feature toggles to complex environment-specific configurations.

## Basic Conditional Resources

The simplest form of conditional deployment is using the `if` keyword on a resource declaration. The resource is only deployed when the condition evaluates to `true`.

```bicep
// main.bicep - deploy a Redis cache only in production
param environmentName string
param location string = resourceGroup().location

// Redis cache - only deployed in staging and production
resource redisCache 'Microsoft.Cache/redis@2023-08-01' = if (environmentName == 'production' || environmentName == 'staging') {
  name: 'redis-${environmentName}'
  location: location
  properties: {
    sku: {
      name: environmentName == 'production' ? 'Premium' : 'Basic'
      family: environmentName == 'production' ? 'P' : 'C'
      capacity: environmentName == 'production' ? 1 : 0
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}
```

When `environmentName` is `'dev'`, the Redis cache is not deployed at all. Bicep does not generate any ARM template resources for it, so there is no cost and no resource in Azure.

## Conditional Properties with Ternary Expressions

Sometimes you want to deploy the same resource in every environment but with different configurations. Use ternary expressions for this:

```bicep
// Storage account deployed everywhere but with different SKUs per environment
param environmentName string
param location string = resourceGroup().location

// Determine storage redundancy based on environment
var storageSku = environmentName == 'production' ? 'Standard_GRS' : 'Standard_LRS'
var storageKind = environmentName == 'production' ? 'StorageV2' : 'StorageV2'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'st${uniqueString(resourceGroup().id)}${environmentName}'
  location: location
  sku: {
    name: storageSku
  }
  kind: storageKind
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    // Enable soft delete only in production (protects against accidental deletion)
    allowBlobPublicAccess: false
  }
}

// Blob service with environment-specific retention
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: environmentName == 'production' ? 30 : 7
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: environmentName == 'production' ? 30 : 7
    }
  }
}
```

## Using Boolean Parameters as Feature Flags

For more granular control, use boolean parameters that act as feature flags:

```bicep
// Feature flags for optional components
param enableRedis bool = false
param enableCdn bool = false
param enableAppInsights bool = true
param enableDiagnosticLogs bool = true
param location string = resourceGroup().location
param appName string

// Application Insights - deployed when the flag is true
resource appInsights 'Microsoft.Insights/components@2020-02-02' = if (enableAppInsights) {
  name: 'ai-${appName}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    RetentionInDays: 90
  }
}

// Web App - always deployed, but configuration varies based on flags
resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: 'app-${appName}'
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      appSettings: concat(
        // Base settings that always exist
        [
          {
            name: 'WEBSITE_NODE_DEFAULT_VERSION'
            value: '20-lts'
          }
        ],
        // Conditionally add Application Insights settings
        enableAppInsights ? [
          {
            name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
            value: appInsights.properties.ConnectionString
          }
          {
            name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
            value: '~3'
          }
        ] : [],
        // Conditionally add Redis connection string
        enableRedis ? [
          {
            name: 'REDIS_CONNECTION_STRING'
            value: redisCache.properties.hostName
          }
        ] : []
      )
    }
  }
}

// App Service Plan - always deployed
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'asp-${appName}'
  location: location
  sku: {
    name: 'P1v3'
  }
  properties: {
    reserved: true
  }
}

// Redis Cache - only when enabled
resource redisCache 'Microsoft.Cache/redis@2023-08-01' = if (enableRedis) {
  name: 'redis-${appName}'
  location: location
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

// CDN - only when enabled
resource cdnProfile 'Microsoft.Cdn/profiles@2023-05-01' = if (enableCdn) {
  name: 'cdn-${appName}'
  location: 'global'
  sku: {
    name: 'Standard_Microsoft'
  }
}
```

The parameter files then control which features are enabled per environment:

```bicep
// parameters.dev.bicepparam
using './main.bicep'

param appName = 'myapp-dev'
param enableRedis = false
param enableCdn = false
param enableAppInsights = true
param enableDiagnosticLogs = false
```

```bicep
// parameters.production.bicepparam
using './main.bicep'

param appName = 'myapp-prod'
param enableRedis = true
param enableCdn = true
param enableAppInsights = true
param enableDiagnosticLogs = true
```

## Conditional Modules

You can also conditionally deploy entire modules:

```bicep
// main.bicep - conditionally deploy a monitoring module
param environmentName string
param location string = resourceGroup().location
param appName string

// Only deploy the full monitoring stack in production and staging
module monitoring 'modules/monitoring.bicep' = if (environmentName != 'dev') {
  name: 'monitoring-deployment'
  params: {
    appName: appName
    location: location
    logRetentionDays: environmentName == 'production' ? 90 : 30
  }
}

// Only deploy the WAF module in production
module waf 'modules/waf.bicep' = if (environmentName == 'production') {
  name: 'waf-deployment'
  params: {
    appName: appName
    location: location
  }
}
```

## Conditional Outputs

Outputs can also be conditional. Use the conditional resource's properties in an output, but you need to handle the case where the resource was not deployed:

```bicep
// Conditional outputs that depend on whether resources were deployed
output redisHostName string = enableRedis ? redisCache.properties.hostName : 'not-deployed'
output cdnEndpoint string = enableCdn ? cdnProfile.name : 'not-deployed'
output appInsightsKey string = enableAppInsights ? appInsights.properties.InstrumentationKey : 'not-deployed'
```

## Pattern: Environment Configuration Map

For complex environment-specific configurations, use an object variable that maps environment names to their settings:

```bicep
// Environment configuration map - all settings in one place
param environmentName string
param location string = resourceGroup().location

// Map of environment-specific configurations
var envConfig = {
  dev: {
    appServiceSku: 'B1'
    sqlSku: 'Basic'
    sqlDtus: 5
    storageRedundancy: 'Standard_LRS'
    enableRedis: false
    enableCdn: false
    enableWaf: false
    minInstances: 1
    maxInstances: 1
  }
  staging: {
    appServiceSku: 'P1v3'
    sqlSku: 'S1'
    sqlDtus: 20
    storageRedundancy: 'Standard_LRS'
    enableRedis: true
    enableCdn: false
    enableWaf: false
    minInstances: 1
    maxInstances: 3
  }
  production: {
    appServiceSku: 'P2v3'
    sqlSku: 'S3'
    sqlDtus: 100
    storageRedundancy: 'Standard_GRS'
    enableRedis: true
    enableCdn: true
    enableWaf: true
    minInstances: 2
    maxInstances: 10
  }
}

// Look up the current environment's config
var config = envConfig[environmentName]

// Now use config throughout the template
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'asp-${environmentName}'
  location: location
  sku: {
    name: config.appServiceSku
  }
  properties: {
    reserved: true
  }
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'st${uniqueString(resourceGroup().id)}'
  location: location
  sku: {
    name: config.storageRedundancy
  }
  kind: 'StorageV2'
}

resource redisCache 'Microsoft.Cache/redis@2023-08-01' = if (config.enableRedis) {
  name: 'redis-${environmentName}'
  location: location
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}
```

This pattern is clean because all environment differences are captured in one place. When someone asks "what is different about production?", they can look at the config map and see everything at a glance.

## Using Conditions in Loops

You can combine conditions with loops for deploying a variable number of resources:

```bicep
// Deploy diagnostic settings for each category, but only if diagnostics are enabled
param enableDiagnostics bool = false
param logCategories array = [
  'AppServiceHTTPLogs'
  'AppServiceConsoleLogs'
  'AppServiceAppLogs'
]

resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01' = [for category in logCategories: if (enableDiagnostics) {
  name: 'diag-${category}'
  scope: webApp
  properties: {
    logs: [
      {
        category: category
        enabled: true
        retentionPolicy: {
          days: 30
          enabled: true
        }
      }
    ]
  }
}]
```

## Deploying with Conditions in a Pipeline

Here is how to use conditional deployments in an Azure Pipeline:

```yaml
# Deploy with environment-specific parameters
parameters:
  - name: environment
    type: string
    default: 'dev'
    values: [dev, staging, production]

stages:
  - stage: Deploy
    jobs:
      - job: DeployInfra
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: AzureCLI@2
            inputs:
              azureSubscription: '${{ parameters.environment }}-connection'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                az deployment group create \
                  --resource-group "rg-myapp-${{ parameters.environment }}" \
                  --template-file "infra/main.bicep" \
                  --parameters environmentName=${{ parameters.environment }}
            displayName: 'Deploy infrastructure'
```

## Common Pitfalls

1. **Referencing conditional resource properties.** If you reference a property of a conditional resource in another resource, make sure that other resource also has the same condition or handles the case where the conditional resource does not exist.

2. **Existing resource references.** You cannot use `existing` references to resources that might not exist. If you need to reference a resource that may or may not be deployed, pass its properties as parameters instead.

3. **Nested conditions.** Bicep does not support `if` inside resource property blocks. Use ternary expressions for property-level conditions and `if` for resource-level conditions.

## Wrapping Up

Conditional deployments in Bicep let you maintain a single template that adapts to different environments. Instead of duplicating templates or using complex branching in your pipeline, you express the differences directly in the infrastructure code. Boolean feature flags give you granular control, environment configuration maps keep everything organized, and conditional modules let you compose larger architectures from optional building blocks. The result is infrastructure code that is easier to understand, easier to maintain, and less likely to drift between environments.
