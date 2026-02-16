# How to Use Azure Bicep Loops and Iterations to Deploy Multiple Similar Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Bicep, Infrastructure as Code, Azure, Loops, ARM Templates, DevOps, Cloud Deployment

Description: Learn how to use Bicep for-loops and iteration expressions to deploy multiple similar Azure resources without duplicating template code.

---

One of the most tedious things in infrastructure as code is defining the same resource over and over when you need multiple instances. Need five storage accounts? Five separate resource blocks. Ten virtual machines? Ten blocks of nearly identical configuration. This is exactly the problem that Bicep loops solve.

Bicep provides a `for` expression that lets you iterate over arrays and ranges to generate multiple resource instances from a single definition. If you have worked with loops in any programming language, the concept is familiar. The syntax is clean and the result is dramatically less template code. Let me walk through the various loop patterns and when to use each one.

## Basic Loop Over an Array

The simplest loop pattern iterates over an array of values. Here is a practical example that creates storage accounts for different environments:

```bicep
// Define the environments we need storage accounts for
param environments array = [
  'dev'
  'staging'
  'prod'
]

param location string = resourceGroup().location

// Create one storage account per environment using a for loop
resource storageAccounts 'Microsoft.Storage/storageAccounts@2023-01-01' = [for env in environments: {
  // Storage account names must be globally unique, so we append a unique suffix
  name: 'storage${env}${uniqueString(resourceGroup().id)}'
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  tags: {
    Environment: env
  }
}]

// Output the names of all created storage accounts
output storageAccountNames array = [for (env, i) in environments: storageAccounts[i].name]
```

This single resource block produces three storage accounts. The `env` variable takes each value from the `environments` array in turn.

## Loop with Index

When you need both the item and its position in the array, use the index variant:

```bicep
// Define subnet configurations as an array of objects
param subnets array = [
  {
    name: 'web-subnet'
    addressPrefix: '10.0.1.0/24'
  }
  {
    name: 'app-subnet'
    addressPrefix: '10.0.2.0/24'
  }
  {
    name: 'data-subnet'
    addressPrefix: '10.0.3.0/24'
  }
]

// Create a virtual network with multiple subnets
resource vnet 'Microsoft.Network/virtualNetworks@2023-05-01' = {
  name: 'main-vnet'
  location: resourceGroup().location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.0.0.0/16'
      ]
    }
    // Use a loop to generate subnet configurations from the parameter array
    subnets: [for (subnet, index) in subnets: {
      name: subnet.name
      properties: {
        addressPrefix: subnet.addressPrefix
      }
    }]
  }
}
```

The `index` variable gives you the zero-based position, which is useful when you need to reference other resources by their loop index.

## Loop with Range

If you need a specific number of identical resources, use the `range()` function instead of an array:

```bicep
// Deploy a specific number of VMs using a numeric range
param vmCount int = 3
param location string = resourceGroup().location
param adminUsername string = 'azureuser'

@secure()
param adminPassword string

// Create network interfaces for each VM
resource nics 'Microsoft.Network/networkInterfaces@2023-05-01' = [for i in range(0, vmCount): {
  name: 'vm-nic-${i}'
  location: location
  properties: {
    ipConfigurations: [
      {
        name: 'ipconfig1'
        properties: {
          subnet: {
            id: subnetId  // Reference to an existing subnet
          }
          privateIPAllocationMethod: 'Dynamic'
        }
      }
    ]
  }
}]

// Create VMs using the range function
// range(0, vmCount) produces [0, 1, 2] when vmCount is 3
resource virtualMachines 'Microsoft.Compute/virtualMachines@2023-07-01' = [for i in range(0, vmCount): {
  name: 'worker-vm-${i}'
  location: location
  properties: {
    hardwareProfile: {
      vmSize: 'Standard_B2s'
    }
    osProfile: {
      computerName: 'worker-${i}'
      adminUsername: adminUsername
      adminPassword: adminPassword
    }
    networkProfile: {
      networkInterfaces: [
        {
          // Reference the NIC created in the loop above using the same index
          id: nics[i].id
        }
      ]
    }
    storageProfile: {
      imageReference: {
        publisher: 'Canonical'
        offer: '0001-com-ubuntu-server-jammy'
        sku: '22_04-lts'
        version: 'latest'
      }
      osDisk: {
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: 'Standard_LRS'
        }
      }
    }
  }
}]
```

## Conditional Loops with Filtering

You can combine loops with conditions to selectively create resources. The `if` keyword works within the loop body:

```bicep
// Define a list of apps with their deployment preferences
param applications array = [
  {
    name: 'frontend'
    needsStorage: true
    tier: 'Standard'
  }
  {
    name: 'api'
    needsStorage: false
    tier: 'Premium'
  }
  {
    name: 'worker'
    needsStorage: true
    tier: 'Standard'
  }
]

// Only create storage accounts for apps that need them
// The condition filters which iterations actually produce a resource
resource appStorage 'Microsoft.Storage/storageAccounts@2023-01-01' = [for app in applications: if (app.needsStorage) {
  name: 'st${app.name}${uniqueString(resourceGroup().id)}'
  location: resourceGroup().location
  kind: 'StorageV2'
  sku: {
    name: app.tier == 'Premium' ? 'Premium_LRS' : 'Standard_LRS'
  }
  tags: {
    Application: app.name
  }
}]
```

## Nested Loops

Bicep supports nested loops through modules. You cannot directly nest `for` expressions in resource definitions, but you can call a module inside a loop, and that module can contain its own loop:

```bicep
// main.bicep - Outer loop iterates over environments
param environments array = [
  {
    name: 'dev'
    appCount: 2
  }
  {
    name: 'staging'
    appCount: 3
  }
  {
    name: 'prod'
    appCount: 5
  }
]

// Deploy the app-set module for each environment
// Each module invocation will create multiple app service plans
module appSets 'modules/app-set.bicep' = [for env in environments: {
  name: 'deploy-${env.name}-apps'
  params: {
    environmentName: env.name
    appCount: env.appCount
    location: resourceGroup().location
  }
}]
```

```bicep
// modules/app-set.bicep - Inner loop creates multiple app service plans
param environmentName string
param appCount int
param location string

// Create multiple app service plans for this environment
resource appPlans 'Microsoft.Web/serverfarms@2023-01-01' = [for i in range(0, appCount): {
  name: 'plan-${environmentName}-${i}'
  location: location
  sku: {
    name: environmentName == 'prod' ? 'P1v3' : 'B1'
  }
  tags: {
    Environment: environmentName
    Index: string(i)
  }
}]

output planIds array = [for i in range(0, appCount): appPlans[i].id]
```

## Loops in Variable Definitions

Loops are not limited to resources. You can use them in variable definitions to transform data:

```bicep
// Input: a simple list of role names
param roleNames array = [
  'reader'
  'contributor'
  'owner'
]

// Transform the simple list into structured objects using a loop in a variable
var roleDefinitions = [for (role, i) in roleNames: {
  name: role
  index: i
  displayName: '${toUpper(role[0])}${substring(role, 1)}'  // Capitalize first letter
}]

// Use the transformed variable elsewhere in the template
output roles array = roleDefinitions
```

## Loops in Output Definitions

Getting values out of looped resources is a common need. Use loops in outputs to collect IDs, names, or other properties:

```bicep
param locations array = [
  'eastus'
  'westeurope'
  'southeastasia'
]

resource storageAccounts 'Microsoft.Storage/storageAccounts@2023-01-01' = [for loc in locations: {
  name: 'st${loc}${uniqueString(resourceGroup().id)}'
  location: loc
  kind: 'StorageV2'
  sku: {
    name: 'Standard_GRS'
  }
}]

// Output an array of objects containing each account's name and primary endpoint
output accountDetails array = [for (loc, i) in locations: {
  location: loc
  name: storageAccounts[i].name
  blobEndpoint: storageAccounts[i].properties.primaryEndpoints.blob
}]
```

## Batch Size Control with @batchSize

By default, Bicep deploys all loop iterations in parallel. If you need to limit parallelism (for example, to avoid hitting API rate limits), use the `@batchSize` decorator:

```bicep
// Deploy VMs in batches of 2 to avoid overwhelming the Azure API
// Without this, all VMs would be created simultaneously
@batchSize(2)
resource virtualMachines 'Microsoft.Compute/virtualMachines@2023-07-01' = [for i in range(0, 10): {
  name: 'vm-${i}'
  location: resourceGroup().location
  properties: {
    // VM configuration
  }
}]
```

Setting `@batchSize(1)` forces sequential deployment, which is useful when resources depend on each other in order.

## Real-World Example: Multi-Region App Deployment

Here is a more complete example that deploys an application across multiple regions with all supporting resources:

```bicep
// Deploy a web application to multiple Azure regions
param regions array = [
  {
    location: 'eastus'
    sku: 'P1v3'
    isPrimary: true
  }
  {
    location: 'westeurope'
    sku: 'P1v3'
    isPrimary: false
  }
]

param appName string = 'mywebapp'

// Create an App Service Plan in each region
resource appPlans 'Microsoft.Web/serverfarms@2023-01-01' = [for region in regions: {
  name: '${appName}-plan-${region.location}'
  location: region.location
  sku: {
    name: region.sku
  }
  tags: {
    Application: appName
    Region: region.location
    IsPrimary: string(region.isPrimary)
  }
}]

// Create a Web App in each region, linked to its regional plan
resource webApps 'Microsoft.Web/sites@2023-01-01' = [for (region, i) in regions: {
  name: '${appName}-${region.location}'
  location: region.location
  properties: {
    serverFarmId: appPlans[i].id
    httpsOnly: true
    siteConfig: {
      minTlsVersion: '1.2'
      alwaysOn: true
    }
  }
  tags: {
    Application: appName
    Region: region.location
  }
}]

output webAppUrls array = [for (region, i) in regions: {
  region: region.location
  url: 'https://${webApps[i].properties.defaultHostName}'
}]
```

## Wrapping Up

Bicep loops eliminate the copy-paste problem in infrastructure templates. Whether you need to create multiple storage accounts, deploy VMs across regions, or generate complex network configurations, the `for` expression keeps your templates DRY and maintainable. Start with simple array loops, graduate to indexed iterations when you need cross-references between looped resources, and use modules for nested loop scenarios. The result is cleaner infrastructure code that is easier to review, update, and reason about.
