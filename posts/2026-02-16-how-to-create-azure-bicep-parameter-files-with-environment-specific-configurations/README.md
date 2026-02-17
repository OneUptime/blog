# How to Create Azure Bicep Parameter Files with Environment-Specific Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Bicep, Parameters, IaC, DevOps, Configuration Management, Cloud

Description: Learn how to structure Bicep parameter files for dev, staging, and production environments with type-safe configurations and best practices.

---

Every Azure environment is a little different. Development gets smaller VMs and shorter retention periods. Production gets geo-redundant storage and premium SKUs. When you deploy with Bicep, parameter files are how you capture those differences while keeping a single template. Done well, they make your deployments predictable and your environments consistent. Done poorly, they become a source of hard-to-track configuration drift.

This post covers how to create and structure Bicep parameter files for environment-specific deployments, including the newer `.bicepparam` format that Bicep introduced as a typed alternative to JSON parameter files.

## The Basics of Bicep Parameters

A Bicep template declares parameters with types, defaults, and validation.

```bicep
// main.bicep - Template with parameterized values
@description('The deployment environment')
@allowed([
  'dev'
  'staging'
  'prod'
])
param environment string

@description('The Azure region for resources')
param location string = resourceGroup().location

@description('The SKU for the App Service Plan')
@allowed([
  'B1'
  'S1'
  'P1v3'
  'P2v3'
])
param appServicePlanSku string

@description('Number of worker instances')
@minValue(1)
@maxValue(20)
param instanceCount int

@description('Enable geo-redundant storage')
param enableGeoRedundancy bool = false

@description('Log retention in days')
@minValue(7)
@maxValue(730)
param logRetentionDays int = 30

@description('Tags to apply to all resources')
param tags object = {}
```

## JSON Parameter Files (Classic Approach)

The traditional way to supply parameters is with a `.parameters.json` file. You create one per environment.

```json
// parameters.dev.json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": {
      "value": "dev"
    },
    "appServicePlanSku": {
      "value": "B1"
    },
    "instanceCount": {
      "value": 1
    },
    "enableGeoRedundancy": {
      "value": false
    },
    "logRetentionDays": {
      "value": 7
    },
    "tags": {
      "value": {
        "environment": "dev",
        "cost-center": "engineering",
        "managed-by": "bicep"
      }
    }
  }
}
```

```json
// parameters.prod.json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": {
      "value": "prod"
    },
    "appServicePlanSku": {
      "value": "P2v3"
    },
    "instanceCount": {
      "value": 5
    },
    "enableGeoRedundancy": {
      "value": true
    },
    "logRetentionDays": {
      "value": 365
    },
    "tags": {
      "value": {
        "environment": "prod",
        "cost-center": "engineering",
        "managed-by": "bicep",
        "sla-tier": "gold"
      }
    }
  }
}
```

Deploy with a specific parameter file.

```bash
# Deploy to dev
az deployment group create \
  --resource-group rg-app-dev \
  --template-file main.bicep \
  --parameters parameters.dev.json

# Deploy to prod
az deployment group create \
  --resource-group rg-app-prod \
  --template-file main.bicep \
  --parameters parameters.prod.json
```

## Bicep Parameter Files (.bicepparam)

Bicep now supports a native parameter file format with the `.bicepparam` extension. It is type-safe, supports expressions, and links directly to the Bicep template.

```bicep
// parameters.dev.bicepparam
using './main.bicep'

param environment = 'dev'
param appServicePlanSku = 'B1'
param instanceCount = 1
param enableGeoRedundancy = false
param logRetentionDays = 7
param tags = {
  environment: 'dev'
  'cost-center': 'engineering'
  'managed-by': 'bicep'
}
```

```bicep
// parameters.staging.bicepparam
using './main.bicep'

param environment = 'staging'
param appServicePlanSku = 'S1'
param instanceCount = 2
param enableGeoRedundancy = false
param logRetentionDays = 30
param tags = {
  environment: 'staging'
  'cost-center': 'engineering'
  'managed-by': 'bicep'
}
```

```bicep
// parameters.prod.bicepparam
using './main.bicep'

param environment = 'prod'
param appServicePlanSku = 'P2v3'
param instanceCount = 5
param enableGeoRedundancy = true
param logRetentionDays = 365
param tags = {
  environment: 'prod'
  'cost-center': 'engineering'
  'managed-by': 'bicep'
  'sla-tier': 'gold'
}
```

The `using` keyword links the parameter file to its template. This means the Bicep tooling can validate parameter names and types at authoring time, before you even try to deploy. If you misspell a parameter name or pass the wrong type, you get an error immediately.

Deploy with a `.bicepparam` file.

```bash
az deployment group create \
  --resource-group rg-app-prod \
  --parameters parameters.prod.bicepparam
```

Notice that you do not need to specify `--template-file` when using `.bicepparam` files - the template path is embedded in the file through the `using` statement.

## Referencing Key Vault Secrets in Parameter Files

For sensitive values like database passwords, you can reference Azure Key Vault secrets directly in JSON parameter files.

```json
// parameters.prod.json - with Key Vault reference
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "sqlAdminPassword": {
      "reference": {
        "keyVault": {
          "id": "/subscriptions/xxx/resourceGroups/rg-security/providers/Microsoft.KeyVault/vaults/kv-secrets-prod"
        },
        "secretName": "sql-admin-password"
      }
    },
    "environment": {
      "value": "prod"
    }
  }
}
```

This way, sensitive values never appear in plain text in your parameter files or version control. The deployment process fetches them directly from Key Vault at deploy time.

## Structuring Parameter Files for Complex Projects

For larger projects, organize your parameter files alongside your templates.

```
infrastructure/
  modules/
    networking/
      main.bicep
      parameters/
        dev.bicepparam
        staging.bicepparam
        prod.bicepparam
    compute/
      main.bicep
      parameters/
        dev.bicepparam
        staging.bicepparam
        prod.bicepparam
    database/
      main.bicep
      parameters/
        dev.bicepparam
        staging.bicepparam
        prod.bicepparam
  main.bicep
  parameters/
    dev.bicepparam
    staging.bicepparam
    prod.bicepparam
```

Each module has its own set of environment-specific parameter files. The top-level `main.bicep` orchestrates the modules, and its parameter files contain the high-level environment settings.

## Using Variables Within .bicepparam Files

The `.bicepparam` format supports variables and expressions, which is useful for computed values.

```bicep
// parameters.prod.bicepparam
using './main.bicep'

// Variables for computed values
var prefix = 'prod'
var region = 'eastus'

param environment = 'prod'
param appServicePlanSku = 'P2v3'
param instanceCount = 5
param enableGeoRedundancy = true
param logRetentionDays = 365
param resourcePrefix = prefix
param tags = {
  environment: prefix
  region: region
  'cost-center': 'engineering'
  'managed-by': 'bicep'
  'deploy-date': '2026-02-16'
}
```

## Overriding Parameters on the Command Line

You can override individual parameters from the command line, which is useful in CI/CD pipelines where some values come from pipeline variables.

```bash
# Use a parameter file but override the instance count
az deployment group create \
  --resource-group rg-app-prod \
  --template-file main.bicep \
  --parameters parameters.prod.json \
  --parameters instanceCount=10
```

Command-line parameters take precedence over file parameters. This is handy for things like build numbers or deployment timestamps that change with every run.

## Validation Before Deployment

Always validate your parameter files before deploying, especially to production.

```bash
# Validate the template with parameters
az deployment group validate \
  --resource-group rg-app-prod \
  --template-file main.bicep \
  --parameters parameters.prod.json

# Preview changes with what-if
az deployment group what-if \
  --resource-group rg-app-prod \
  --template-file main.bicep \
  --parameters parameters.prod.json
```

The validate command checks syntax, parameter types, and Azure API compatibility. The what-if command shows you exactly what will change in your environment.

## Best Practices

Keep parameter files in version control alongside your templates. They are part of your infrastructure definition and should go through the same review process.

Use the `.bicepparam` format for new projects. The type safety and template linking catch errors earlier than JSON parameter files.

Never put secrets in parameter files. Use Key Vault references for JSON files, or pipeline variables that get passed as command-line overrides.

Document the differences between environments in your parameter files with comments. Future team members will thank you when they need to understand why production has different settings than staging.

Review parameter file changes carefully in pull requests. A single changed number - like scaling down from 5 instances to 1 in production - can have major consequences.

## Conclusion

Bicep parameter files are the mechanism that makes a single template work across all your environments. Whether you use the traditional JSON format or the newer `.bicepparam` format, the principle is the same: separate your configuration from your infrastructure definition. This separation keeps your templates reusable, your environments consistent, and your deployments predictable.
