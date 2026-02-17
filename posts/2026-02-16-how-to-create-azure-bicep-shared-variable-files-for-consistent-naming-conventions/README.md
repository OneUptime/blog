# How to Create Azure Bicep Shared Variable Files for Consistent Naming Conventions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Bicep, Naming Conventions, Infrastructure as Code, Best Practices, Modules, DevOps

Description: Learn how to create shared variable files in Azure Bicep to enforce consistent naming conventions across all your infrastructure deployments.

---

One of the most common sources of friction in Azure deployments is inconsistent resource naming. One team names their storage accounts `storageacctprod01`, another uses `sa-myapp-prod`, and a third goes with `prodwestus2storage`. When you are trying to find resources, apply policies, or figure out what something belongs to, this inconsistency wastes time and causes mistakes.

Bicep does not have a built-in concept of shared variable files the way Terraform has `.tfvars` files. But there are several effective patterns to achieve the same result. This post covers the most practical approaches to centralizing naming conventions and shared configuration in Bicep projects.

## The Problem with Ad-Hoc Naming

Before jumping into solutions, let us be clear about what we are solving. Without a centralized naming strategy, you end up with:

- Resources that do not clearly indicate their purpose, environment, or region
- Naming conflicts when deploying to the same subscription
- Difficulty searching for resources across environments
- Policy violations when governance requires specific naming patterns
- Confusion during incident response when you cannot quickly identify what a resource does

Azure has specific naming rules for each resource type (length limits, allowed characters), which makes a one-size-fits-all approach impossible. A storage account cannot have hyphens, but a virtual network can. A key vault has a 24-character limit, while a virtual machine allows 64.

## Pattern 1: User-Defined Types with a Naming Module

The cleanest approach in Bicep is to create a dedicated module that generates names based on your conventions. Every other module calls this naming module to get the right names.

Here is a naming module that handles the most common Azure resource types.

```bicep
// modules/naming.bicep - Centralized naming convention generator

// Input parameters that define the naming context
@description('Short name for the application or workload (max 10 chars)')
@maxLength(10)
param appName string

@description('Environment abbreviation')
@allowed(['dev', 'stg', 'prd', 'sbx'])
param environment string

@description('Azure region short name')
@allowed(['eus2', 'wus2', 'neu', 'weu', 'sea'])
param regionShort string

@description('Optional instance number for resources that may have multiples')
param instance string = '001'

// Base name components used across all resources
var baseName = '${appName}-${environment}-${regionShort}'
var baseNameNoHyphens = replace(baseName, '-', '')

// Generate names following Azure naming conventions
// Each name respects the resource type's constraints
output names object = {
  // Resource Group: rg-<app>-<env>-<region>-<instance>
  resourceGroup: 'rg-${baseName}-${instance}'

  // Virtual Network: vnet-<app>-<env>-<region>
  virtualNetwork: 'vnet-${baseName}'

  // Subnet: snet-<purpose> (purpose is added by the caller)
  subnetPrefix: 'snet'

  // Network Security Group: nsg-<app>-<env>-<region>
  networkSecurityGroup: 'nsg-${baseName}'

  // Storage Account: st<app><env><region><instance> (no hyphens, max 24 chars)
  storageAccount: take('st${baseNameNoHyphens}${instance}', 24)

  // Key Vault: kv-<app>-<env>-<region> (max 24 chars)
  keyVault: take('kv-${baseName}', 24)

  // App Service Plan: plan-<app>-<env>-<region>
  appServicePlan: 'plan-${baseName}'

  // App Service: app-<app>-<env>-<region>
  appService: 'app-${baseName}'

  // Function App: func-<app>-<env>-<region>
  functionApp: 'func-${baseName}'

  // SQL Server: sql-<app>-<env>-<region>
  sqlServer: 'sql-${baseName}'

  // SQL Database: sqldb-<app>-<env>-<region>
  sqlDatabase: 'sqldb-${baseName}'

  // Cosmos DB: cosmos-<app>-<env>-<region>
  cosmosDb: 'cosmos-${baseName}'

  // Log Analytics: log-<app>-<env>-<region>
  logAnalytics: 'log-${baseName}'

  // Application Insights: appi-<app>-<env>-<region>
  appInsights: 'appi-${baseName}'

  // Container Registry: cr<app><env><region> (no hyphens, max 50 chars)
  containerRegistry: take('cr${baseNameNoHyphens}', 50)

  // AKS Cluster: aks-<app>-<env>-<region>
  aksCluster: 'aks-${baseName}'

  // Public IP: pip-<app>-<env>-<region>
  publicIp: 'pip-${baseName}'

  // Load Balancer: lb-<app>-<env>-<region>
  loadBalancer: 'lb-${baseName}'
}

// Also output the common tags that should be applied to all resources
output tags object = {
  Application: appName
  Environment: environment
  Region: regionShort
  ManagedBy: 'bicep'
}
```

Now every deployment that needs resource names consumes this module.

```bicep
// main.bicep - Using the naming module

param appName string = 'payments'
param environment string = 'prd'
param regionShort string = 'eus2'
param location string = 'eastus2'

// Generate all resource names from the shared naming module
module naming 'modules/naming.bicep' = {
  name: 'naming-convention'
  params: {
    appName: appName
    environment: environment
    regionShort: regionShort
  }
}

// Use the generated names throughout the deployment
resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: naming.outputs.names.resourceGroup
  location: location
  tags: naming.outputs.tags
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: naming.outputs.names.storageAccount
  location: location
  tags: naming.outputs.tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
  }
}
```

## Pattern 2: Shared Variable Files Using loadJsonContent

Bicep's `loadJsonContent` function lets you read JSON files at compile time. This is perfect for shared configuration that multiple Bicep files need to reference.

Create a JSON file with your naming rules and shared settings.

```json
{
  "naming": {
    "prefixes": {
      "resourceGroup": "rg",
      "virtualNetwork": "vnet",
      "subnet": "snet",
      "networkSecurityGroup": "nsg",
      "storageAccount": "st",
      "keyVault": "kv",
      "appServicePlan": "plan",
      "appService": "app",
      "functionApp": "func",
      "sqlServer": "sql"
    },
    "environments": {
      "development": "dev",
      "staging": "stg",
      "production": "prd",
      "sandbox": "sbx"
    },
    "regions": {
      "eastus2": "eus2",
      "westus2": "wus2",
      "northeurope": "neu",
      "westeurope": "weu"
    }
  },
  "defaults": {
    "tags": {
      "ManagedBy": "bicep",
      "CostTracking": "enabled"
    },
    "storage": {
      "minimumTlsVersion": "TLS1_2",
      "allowBlobPublicAccess": false,
      "supportsHttpsTrafficOnly": true
    },
    "network": {
      "dnsServers": [],
      "enableDdosProtection": false
    }
  }
}
```

Reference this file in your Bicep templates.

```bicep
// main.bicep - Using loadJsonContent for shared configuration

// Load the shared configuration at compile time
var config = loadJsonContent('shared-config.json')

param environment string = 'production'
param location string = 'eastus2'
param appName string = 'orders'

// Look up abbreviations from the config
var envShort = config.naming.environments[environment]
var regionShort = config.naming.regions[location]

// Build names using the shared prefixes
var resourceNames = {
  rg: '${config.naming.prefixes.resourceGroup}-${appName}-${envShort}-${regionShort}'
  vnet: '${config.naming.prefixes.virtualNetwork}-${appName}-${envShort}-${regionShort}'
  storage: take('${config.naming.prefixes.storageAccount}${appName}${envShort}${regionShort}', 24)
}

// Apply shared default settings from the config
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: resourceNames.storage
  location: location
  tags: union(config.defaults.tags, {
    Application: appName
    Environment: environment
  })
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: config.defaults.storage.minimumTlsVersion
    allowBlobPublicAccess: config.defaults.storage.allowBlobPublicAccess
    supportsHttpsTrafficOnly: config.defaults.storage.supportsHttpsTrafficOnly
  }
}
```

## Pattern 3: User-Defined Types for Type Safety

Bicep supports user-defined types, which let you create strongly-typed configuration objects. This catches errors at compile time rather than deployment time.

```bicep
// types.bicep - Shared type definitions

@export()
type environmentType = 'dev' | 'stg' | 'prd' | 'sbx'

@export()
type regionShortType = 'eus2' | 'wus2' | 'neu' | 'weu' | 'sea'

@export()
type networkConfig = {
  addressSpace: string
  subnets: subnetConfig[]
  enableDdosProtection: bool
}

@export()
type subnetConfig = {
  name: string
  addressPrefix: string
  serviceEndpoints: string[]
  delegations: string[]
}

@export()
type storageConfig = {
  sku: 'Standard_LRS' | 'Standard_GRS' | 'Standard_ZRS' | 'Premium_LRS'
  kind: 'StorageV2' | 'BlobStorage' | 'BlockBlobStorage'
  accessTier: 'Hot' | 'Cool'
}
```

Import these types in your main template.

```bicep
// main.bicep - Using imported types
import { environmentType, regionShortType, storageConfig } from 'types.bicep'

param environment environmentType
param regionShort regionShortType
param storageSettings storageConfig = {
  sku: 'Standard_LRS'
  kind: 'StorageV2'
  accessTier: 'Hot'
}
```

## Pattern 4: Bicep Configuration File (bicepconfig.json)

While `bicepconfig.json` is primarily for linter rules and module aliases, you can use module aliases to point to shared naming modules hosted in a registry, making it easy for all teams to consume the same naming logic.

```json
{
  "moduleAliases": {
    "br": {
      "shared": {
        "registry": "crsharedmodules.azurecr.io",
        "modulePath": "bicep/modules"
      }
    }
  },
  "analyzers": {
    "core": {
      "rules": {
        "no-hardcoded-location": {
          "level": "error"
        },
        "prefer-interpolation": {
          "level": "warning"
        }
      }
    }
  }
}
```

Then reference the shared naming module from the registry.

```bicep
// Use the naming module from the shared registry
module naming 'br/shared:naming:v1.2.0' = {
  name: 'naming'
  params: {
    appName: 'myapp'
    environment: 'prd'
    regionShort: 'eus2'
  }
}
```

## Putting It All Together

Here is a complete example that combines the naming module with shared configuration and user-defined types.

```bicep
// deploy.bicep - Full deployment using shared naming conventions

param appName string
param environment string = 'prd'
param location string = 'eastus2'

// Shared config
var config = loadJsonContent('shared-config.json')
var envShort = config.naming.environments[environment]
var regionShort = config.naming.regions[location]

// Naming module
module naming 'modules/naming.bicep' = {
  name: 'naming'
  params: {
    appName: appName
    environment: envShort
    regionShort: regionShort
  }
}

// All resources use consistent names from the module
resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: naming.outputs.names.virtualNetwork
  location: location
  tags: naming.outputs.tags
  properties: {
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: naming.outputs.names.keyVault
  location: location
  tags: naming.outputs.tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
  }
}
```

## Validation and Testing

You can validate your naming conventions by deploying in what-if mode to see the generated names without creating resources.

```bash
# Preview the deployment to check generated names
az deployment group what-if \
  --resource-group rg-test \
  --template-file deploy.bicep \
  --parameters appName='payments' environment='production'
```

## Wrapping Up

Consistent naming in Azure is a solved problem if you invest a small amount of time upfront. Whether you use a Bicep naming module, shared JSON configuration files, or user-defined types, the key is to centralize the naming logic so that every deployment in your organization follows the same conventions. The naming module pattern is the most flexible and is the approach I recommend for most teams. Start with the resource types you use most, get your team to agree on the format, and enforce it through the module.
