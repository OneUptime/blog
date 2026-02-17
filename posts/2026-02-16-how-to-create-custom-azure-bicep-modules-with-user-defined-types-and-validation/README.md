# How to Create Custom Azure Bicep Modules with User-Defined Types and Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Bicep, Modules, User-Defined Types, Validation, Infrastructure as Code, ARM Templates

Description: Learn how to create robust Azure Bicep modules with user-defined types and parameter validation for type-safe and reusable infrastructure templates.

---

Bicep has grown up a lot since its early days. When Microsoft first released it, you got a nicer syntax over ARM templates but not much else. Now with user-defined types and parameter validation decorators, you can build modules that are genuinely pleasant to use and hard to misconfigure. If you have been putting off learning these features, this is a good time to catch up.

In this post, I will walk through creating a production-quality Bicep module that uses user-defined types for structured parameters and validation decorators to catch mistakes before deployment.

## Why User-Defined Types Matter

Before user-defined types, passing complex parameters to Bicep modules meant using `object` type parameters. The problem with `object` is that it accepts anything. You lose autocompletion in your editor, there is no compile-time checking, and consumers of your module have to read the documentation to figure out the expected shape.

User-defined types give you named, structured types with full IntelliSense support in VS Code. Think of them like interfaces in TypeScript or structs in Go. They make your modules self-documenting and catch errors at compile time instead of deploy time.

## Setting Up a Module Project

Let me build a module for deploying an Azure App Service with custom domains and diagnostic settings. This is complex enough to show off the type system while being something you would actually use.

Here is the file structure:

```
modules/
  app-service/
    main.bicep
    types.bicep
```

## Defining User-Defined Types

Start by defining the types your module needs. Bicep lets you define types directly in your module file or import them from another file.

```bicep
// types.bicep - User-defined types for the App Service module

// SKU configuration with allowed values
@description('App Service Plan SKU configuration')
type skuConfig = {
  @description('SKU name like B1, S1, P1v3')
  @allowed([
    'B1'
    'B2'
    'B3'
    'S1'
    'S2'
    'S3'
    'P1v3'
    'P2v3'
    'P3v3'
  ])
  name: string

  @description('Number of instances')
  @minValue(1)
  @maxValue(30)
  capacity: int
}

// Custom domain configuration
@description('Custom domain with optional SSL binding')
type customDomain = {
  @description('The fully qualified domain name')
  @minLength(3)
  hostname: string

  @description('Type of SSL binding')
  @allowed([
    'SniEnabled'
    'IpBasedEnabled'
    'Disabled'
  ])
  sslState: string

  @description('Thumbprint of the SSL certificate - required if sslState is not Disabled')
  thumbprint: string?
}

// Diagnostic settings configuration
@description('Configuration for diagnostic log forwarding')
type diagnosticConfig = {
  @description('Whether to enable diagnostic settings')
  enabled: bool

  @description('Resource ID of the Log Analytics workspace')
  workspaceId: string?

  @description('Retention in days for logs')
  @minValue(0)
  @maxValue(365)
  retentionDays: int?

  @description('Which log categories to enable')
  logCategories: logCategory[]?
}

// Individual log category toggle
type logCategory = {
  @description('Name of the log category')
  category: string

  @description('Whether this category is enabled')
  enabled: bool
}

// Application settings as key-value pairs
type appSetting = {
  @description('Setting name')
  @minLength(1)
  name: string

  @description('Setting value')
  value: string
}
```

A few things to notice here. The `?` suffix makes a property optional. The `@allowed` decorator restricts values to a specific set. The `@minValue` and `@maxValue` decorators enforce numeric ranges. These validations run at compile time and during the preflight validation before deployment even starts.

## Building the Module

Now use these types in the main module:

```bicep
// main.bicep - App Service module with user-defined types

// Import types from the types file
import { skuConfig, customDomain, diagnosticConfig, appSetting } from 'types.bicep'

// Required parameters with type safety
@description('Name of the App Service')
@minLength(2)
@maxLength(60)
param appName string

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('SKU configuration for the App Service Plan')
param sku skuConfig

@description('Runtime stack for the web app')
@allowed([
  'DOTNET|8.0'
  'NODE|20-lts'
  'PYTHON|3.12'
  'JAVA|17-java17'
])
param runtimeStack string

// Optional parameters with defaults
@description('Custom domains to bind to the app')
param customDomains customDomain[] = []

@description('Diagnostic settings configuration')
param diagnostics diagnosticConfig = {
  enabled: false
}

@description('Application settings')
param appSettings appSetting[] = []

@description('Tags to apply to all resources')
param tags object = {}

// Parse runtime stack into components
var linuxFxVersion = runtimeStack

// Create the App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'asp-${appName}'
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: sku.name
    capacity: sku.capacity
  }
  properties: {
    reserved: true  // Required for Linux
  }
}

// Create the Web App
resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: appName
  location: location
  tags: tags
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true  // Enforce HTTPS
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      alwaysOn: contains(['S1', 'S2', 'S3', 'P1v3', 'P2v3', 'P3v3'], sku.name)
      ftpsState: 'Disabled'  // Disable FTP for security
      minTlsVersion: '1.2'
      appSettings: [for setting in appSettings: {
        name: setting.name
        value: setting.value
      }]
    }
  }
}

// Bind custom domains
resource hostNameBindings 'Microsoft.Web/sites/hostNameBindings@2023-01-01' = [for domain in customDomains: {
  name: domain.hostname
  parent: webApp
  properties: {
    siteName: appName
    hostNameType: 'Verified'
    sslState: domain.sslState
    thumbprint: domain.sslState != 'Disabled' ? domain.thumbprint : null
  }
}]

// Configure diagnostic settings if enabled
resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (diagnostics.enabled && diagnostics.workspaceId != null) {
  name: 'diag-${appName}'
  scope: webApp
  properties: {
    workspaceId: diagnostics.workspaceId!
    logs: diagnostics.logCategories != null ? [for cat in diagnostics.logCategories!: {
      category: cat.category
      enabled: cat.enabled
      retentionPolicy: {
        enabled: diagnostics.retentionDays != null
        days: diagnostics.retentionDays ?? 30
      }
    }] : [
      {
        category: 'AppServiceHTTPLogs'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: diagnostics.retentionDays ?? 30
        }
      }
      {
        category: 'AppServiceAppLogs'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: diagnostics.retentionDays ?? 30
        }
      }
    ]
  }
}

// Outputs
@description('Resource ID of the web app')
output appId string = webApp.id

@description('Default hostname of the web app')
output defaultHostname string = webApp.properties.defaultHostName

@description('App Service Plan resource ID')
output planId string = appServicePlan.id
```

## Consuming the Module

Here is what it looks like to call this module. Notice how the type system guides you:

```bicep
// deploy.bicep - Consume the App Service module with type-safe parameters

module webApp 'modules/app-service/main.bicep' = {
  name: 'deploy-webapp'
  params: {
    appName: 'myapp-prod-001'
    location: 'eastus2'

    // IntelliSense shows exactly which SKU names are allowed
    sku: {
      name: 'P1v3'
      capacity: 2
    }

    runtimeStack: 'NODE|20-lts'

    // Custom domains with SSL
    customDomains: [
      {
        hostname: 'www.contoso.com'
        sslState: 'SniEnabled'
        thumbprint: 'ABC123...'
      }
      {
        hostname: 'api.contoso.com'
        sslState: 'SniEnabled'
        thumbprint: 'DEF456...'
      }
    ]

    // Enable diagnostics with specific log categories
    diagnostics: {
      enabled: true
      workspaceId: logAnalytics.outputs.workspaceId
      retentionDays: 90
      logCategories: [
        { category: 'AppServiceHTTPLogs', enabled: true }
        { category: 'AppServiceAppLogs', enabled: true }
        { category: 'AppServiceConsoleLogs', enabled: true }
      ]
    }

    appSettings: [
      { name: 'NODE_ENV', value: 'production' }
      { name: 'PORT', value: '8080' }
    ]

    tags: {
      Environment: 'Production'
      CostCenter: 'Engineering'
    }
  }
}
```

If you try to pass `name: 'X1'` for the SKU, Bicep catches it at compile time with a clear error message. If you forget a required field in the custom domain object, the editor highlights it immediately. This is the quality of developer experience that makes infrastructure code maintainable.

## Advanced Validation with Discriminated Unions

Bicep also supports discriminated unions, which let you define types that change shape based on a discriminator property:

```bicep
// Discriminated union for different authentication types
type authConfig = passwordAuth | certAuth | managedIdentityAuth

type passwordAuth = {
  @description('Authentication method discriminator')
  type: 'password'
  username: string
  @secure()
  password: string
}

type certAuth = {
  @description('Authentication method discriminator')
  type: 'certificate'
  certPath: string
  @secure()
  certPassword: string
}

type managedIdentityAuth = {
  @description('Authentication method discriminator')
  type: 'managedIdentity'
  clientId: string?  // null for system-assigned
}
```

This pattern is powerful when your module supports multiple configuration modes. The consumer picks the type they need and only provides the properties relevant to that type.

## Testing Your Modules

Always validate your modules before publishing. Bicep provides a build command that checks syntax and types:

```bash
# Compile the module to verify it is valid
az bicep build --file modules/app-service/main.bicep

# Run what-if deployment to preview changes without applying
az deployment group what-if \
  --resource-group rg-test \
  --template-file deploy.bicep
```

## Organizing Modules in a Registry

For teams, publish your modules to a Bicep module registry (backed by Azure Container Registry):

```bash
# Publish the module to a private Bicep registry
az bicep publish \
  --file modules/app-service/main.bicep \
  --target br:myregistry.azurecr.io/bicep/modules/app-service:v1.0.0
```

Then consume it from the registry:

```bicep
// Reference a module from a private registry
module webApp 'br:myregistry.azurecr.io/bicep/modules/app-service:v1.0.0' = {
  name: 'deploy-webapp'
  params: {
    // ...
  }
}
```

## Best Practices

After building dozens of Bicep modules, here is what I have learned works well:

Keep types in a separate file when they are complex. It keeps the main module readable and the types reusable. Use optional properties with defaults generously - modules should work with minimal configuration while allowing deep customization. Always add `@description` decorators to types and parameters because they show up in editor tooltips and generated documentation.

User-defined types and validation decorators are what make Bicep modules production-ready. They turn your infrastructure modules from scripts that might work into contracts that are hard to break.
