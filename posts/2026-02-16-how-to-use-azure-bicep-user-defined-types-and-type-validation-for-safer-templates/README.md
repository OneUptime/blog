# How to Use Azure Bicep User-Defined Types and Type Validation for Safer Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Bicep, User-Defined Types, Infrastructure as Code, Azure, Type Safety, DevOps, Cloud Deployment

Description: Learn how to use Azure Bicep user-defined types and type validation to create safer, more maintainable infrastructure templates with compile-time error checking.

---

Infrastructure as code templates have a reliability problem. You write a template, pass in parameters, and hope that the values are correct. If someone passes the wrong type of value or forgets a required property, you do not find out until deployment time - sometimes after resources have already been partially created. Bicep user-defined types change this by letting you define strict type contracts that get validated at compile time, long before anything touches Azure.

User-defined types were introduced as a feature in Bicep and they bring the kind of type safety you would expect in a programming language to your infrastructure templates. In this post, I will walk through defining custom types, using them in parameters and variables, and building type-safe templates that catch errors early.

## Why Type Safety Matters in IaC

Consider a typical Bicep parameter for configuring a virtual machine:

```bicep
// Without user-defined types - everything is loosely typed
param vmConfig object
```

What does `vmConfig` contain? What properties are required? What values are valid? The template author knows, but anyone consuming the template has to read the documentation (if it exists) or look at the code to figure it out. Pass the wrong shape of object and you get a runtime error.

With user-defined types, you make the contract explicit:

```bicep
// With user-defined types - the contract is clear and enforced
type vmConfiguration = {
  name: string
  size: 'Standard_B2s' | 'Standard_D4s_v3' | 'Standard_E8s_v3'
  osType: 'Linux' | 'Windows'
  adminUsername: string
  @secure()
  adminPassword: string
  enablePublicIp: bool
}

param vmConfig vmConfiguration
```

Now anyone using this template knows exactly what to provide. The Bicep compiler validates the input, and incorrect values are caught before deployment.

## Defining Basic User-Defined Types

User-defined types use the `type` keyword. Here are the fundamental patterns:

```bicep
// Simple type alias - gives a meaningful name to a primitive type
type environmentName = 'dev' | 'staging' | 'prod'

// Object type with typed properties
type storageConfig = {
  accountName: string
  sku: 'Standard_LRS' | 'Standard_GRS' | 'Premium_LRS'
  kind: 'StorageV2' | 'BlobStorage'
  enableHttps: bool
}

// Array type - specifies the type of elements
type ipAddresses = string[]

// Array of typed objects
type subnetConfigs = {
  name: string
  addressPrefix: string
  serviceEndpoints: string[]
}[]
```

## Optional Properties

Not every property in an object is always required. Use the `?` modifier to mark properties as optional:

```bicep
// Type with optional properties
type appServiceConfig = {
  name: string                      // Required
  planSku: string                   // Required
  runtime: string                   // Required
  alwaysOn: bool?                   // Optional - defaults to null if not provided
  customDomain: string?             // Optional
  minTlsVersion: '1.0' | '1.2'?    // Optional with constrained values
  cors: {
    allowedOrigins: string[]
  }?                                // Optional nested object
}

param config appServiceConfig

// Use the null-coalescing operator for optional values
resource plan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${config.name}-plan'
  location: resourceGroup().location
  sku: {
    name: config.planSku
  }
  properties: {
    reserved: true
  }
}

resource app 'Microsoft.Web/sites@2023-01-01' = {
  name: config.name
  location: resourceGroup().location
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      alwaysOn: config.alwaysOn ?? false  // Default to false if not provided
      minTlsVersion: config.minTlsVersion ?? '1.2'
    }
  }
}
```

## Union Types for Constrained Values

Union types (also called literal types) let you restrict a property to a set of allowed values:

```bicep
// String literal union - only these exact values are valid
type azureRegion = 'eastus' | 'westus2' | 'westeurope' | 'southeastasia' | 'australiaeast'

// You can use union types anywhere a type is expected
type deploymentConfig = {
  environment: 'dev' | 'staging' | 'prod'
  region: azureRegion
  tier: 'basic' | 'standard' | 'premium'
  replicas: 1 | 2 | 3 | 5  // Integer literal union
}
```

This is much more powerful than the `@allowed` decorator because union types work on individual properties within objects, not just top-level parameters.

## Nested and Composed Types

Types can reference other types, letting you build complex configurations from simpler building blocks:

```bicep
// Define reusable building blocks
type tagsType = {
  Environment: string
  CostCenter: string
  Team: string
  ManagedBy: 'Bicep' | 'Terraform' | 'Manual'
}

type networkConfig = {
  vnetAddressSpace: string
  subnets: subnetDefinition[]
}

type subnetDefinition = {
  name: string
  addressPrefix: string
  nsgEnabled: bool
  serviceEndpoints: string[]?
}

type applicationConfig = {
  name: string
  environment: 'dev' | 'staging' | 'prod'
  network: networkConfig
  tags: tagsType
}

// Use the composed type as a parameter
param appConfig applicationConfig
```

When someone consumes this template, the Bicep compiler ensures every nested property matches the expected type. If someone passes a subnet without an `addressPrefix`, the compiler catches it immediately.

## Using Types with Decorators

Types can be enhanced with decorators for additional validation:

```bicep
// Type with decorator constraints
type resourceNaming = {
  @minLength(3)
  @maxLength(24)
  @description('The name of the storage account. Must be globally unique.')
  storageAccountName: string

  @minLength(1)
  @maxLength(63)
  @description('The name of the resource group.')
  resourceGroupName: string

  @minValue(1)
  @maxValue(100)
  @description('Number of instances to deploy.')
  instanceCount: int
}

// Secure decorator for sensitive values
type credentials = {
  username: string
  @secure()
  password: string
  @secure()
  connectionString: string?
}
```

## Discriminated Unions

Discriminated unions are a pattern for types that can take different shapes based on a common property. This is useful for resources that have different configurations depending on their type:

```bicep
// Define different database configurations using a discriminator
type sqlDatabaseConfig = {
  type: 'sql'
  serverName: string
  databaseName: string
  sku: 'Basic' | 'S0' | 'S1' | 'P1'
  maxSizeGb: int
}

type cosmosDatabaseConfig = {
  type: 'cosmos'
  accountName: string
  databaseName: string
  consistencyLevel: 'Strong' | 'Session' | 'Eventual'
  throughput: int
}

// The discriminated union - a database config is one of these types
@discriminator('type')
type databaseConfig = sqlDatabaseConfig | cosmosDatabaseConfig

// Usage in a parameter
param database databaseConfig

// You can switch on the discriminator to handle each case
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = if (database.type == 'sql') {
  name: database.type == 'sql' ? database.serverName : 'unused'
  location: resourceGroup().location
  properties: {
    administratorLogin: 'adminuser'
  }
}
```

## Type Exports and Imports

You can define types in one Bicep file and import them into another. This lets you share type definitions across multiple templates:

```bicep
// types.bicep - Shared type definitions
@export()
type environmentConfig = {
  name: 'dev' | 'staging' | 'prod'
  location: string
  tags: tagsType
}

@export()
type tagsType = {
  Environment: string
  CostCenter: string
  Team: string
}

@export()
type networkSettings = {
  vnetName: string
  addressSpace: string
  subnets: {
    name: string
    prefix: string
  }[]
}
```

Import and use them in another file:

```bicep
// main.bicep - Import shared types
import { environmentConfig, networkSettings } from 'types.bicep'

param env environmentConfig
param network networkSettings

resource vnet 'Microsoft.Network/virtualNetworks@2023-05-01' = {
  name: network.vnetName
  location: env.location
  properties: {
    addressSpace: {
      addressPrefixes: [network.addressSpace]
    }
    subnets: [for subnet in network.subnets: {
      name: subnet.name
      properties: {
        addressPrefix: subnet.prefix
      }
    }]
  }
  tags: env.tags
}
```

## Practical Example: Multi-Environment Deployment

Here is a complete example that uses user-defined types for a multi-environment application deployment:

```bicep
// types.bicep
@export()
type appDeploymentConfig = {
  environment: 'dev' | 'staging' | 'prod'
  region: 'eastus' | 'westeurope'
  app: {
    name: string
    runtime: 'node20' | 'dotnet8' | 'python312'
    planSku: 'B1' | 'P1v3' | 'P2v3'
    scaling: {
      minInstances: int
      maxInstances: int
    }?
  }
  database: {
    sku: 'Basic' | 'S0' | 'S1' | 'P1'
    maxSizeGb: 1 | 2 | 5 | 10 | 50 | 100
    backupRetentionDays: int?
  }
  monitoring: {
    enabled: bool
    alertEmails: string[]?
  }?
}
```

```bicep
// main.bicep
import { appDeploymentConfig } from 'types.bicep'

param config appDeploymentConfig

// The compiler ensures all properties match the expected types
// Passing an invalid SKU or environment name is a compile-time error

var suffix = uniqueString(resourceGroup().id)
var fullAppName = '${config.app.name}-${config.environment}-${suffix}'

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${fullAppName}-plan'
  location: config.region
  sku: {
    name: config.app.planSku
  }
  properties: {
    reserved: config.app.runtime != 'dotnet8'
  }
}

resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: fullAppName
  location: config.region
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      alwaysOn: config.app.planSku != 'B1'
    }
  }
}

resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: '${fullAppName}-sql'
  location: config.region
  properties: {
    administratorLogin: 'appadmin'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-05-01-preview' = {
  parent: sqlServer
  name: '${config.app.name}db'
  location: config.region
  sku: {
    name: config.database.sku
  }
  properties: {
    maxSizeBytes: config.database.maxSizeGb * 1073741824
  }
}
```

Deploy with a properly typed parameter file:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "config": {
      "value": {
        "environment": "staging",
        "region": "eastus",
        "app": {
          "name": "mywebapp",
          "runtime": "node20",
          "planSku": "P1v3",
          "scaling": {
            "minInstances": 2,
            "maxInstances": 5
          }
        },
        "database": {
          "sku": "S1",
          "maxSizeGb": 10,
          "backupRetentionDays": 14
        },
        "monitoring": {
          "enabled": true,
          "alertEmails": ["ops@company.com"]
        }
      }
    }
  }
}
```

## Wrapping Up

User-defined types bring real type safety to Bicep templates. They catch errors at compile time instead of deployment time, serve as self-documenting contracts for your infrastructure, and make it harder to pass incorrect configurations. Start by defining types for your most commonly used parameter patterns - network configurations, application settings, tagging standards. As you build up a library of shared types, your infrastructure templates become more reliable and easier to maintain. The upfront investment in type definitions pays off every time someone uses your template and gets immediate feedback when something is wrong.
