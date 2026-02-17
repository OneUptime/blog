# How to Deploy Azure Static Web Apps with Custom Domains Using Bicep Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Bicep, Static Web Apps, Custom Domains, Infrastructure as Code, Web Hosting, Frontend

Description: Deploy Azure Static Web Apps with custom domain configuration and SSL using Bicep templates for automated frontend hosting infrastructure.

---

Azure Static Web Apps is a hosting service built for modern frontend applications. It serves static content from globally distributed points of presence, integrates with GitHub Actions or Azure DevOps for CI/CD, provides built-in authentication, and supports serverless API backends through Azure Functions. The custom domain setup is where things often trip people up, especially when you need automated SSL certificates and proper DNS configuration.

Bicep templates let you define the entire Static Web App setup as code, including the app itself, custom domains, and linked backends. This post covers the full process.

## Creating the Static Web App

The Static Web App resource itself is straightforward. The interesting parts are the configuration options for build and deployment.

```bicep
// main.bicep
// Deploys an Azure Static Web App with configuration for a React/Vue/Angular frontend

@description('Location - Static Web Apps have limited region support')
param location string = 'eastus2'

@description('Name of the Static Web App')
param appName string = 'swa-myapp-prod'

@description('The SKU for the Static Web App')
@allowed([
  'Free'
  'Standard'
])
param sku string = 'Standard'

@description('GitHub repository URL for the app source code')
param repositoryUrl string

@description('Branch to deploy from')
param branch string = 'main'

@description('GitHub personal access token for repository access')
@secure()
param repositoryToken string

// Static Web App resource
resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: appName
  location: location
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    // Link to the GitHub repository
    repositoryUrl: repositoryUrl
    branch: branch
    repositoryToken: repositoryToken

    // Build configuration
    buildProperties: {
      // Location of the app source code relative to repo root
      appLocation: '/'
      // Location of the API source code (Azure Functions)
      apiLocation: 'api'
      // Output folder from the build step
      outputLocation: 'dist'
      // Skip the API build if you do not have one
      skipApiDetection: false
    }

    // Staging environment configuration
    stagingEnvironmentPolicy: 'Enabled'

    // Allow configuration file in the repository
    allowConfigFileUpdates: true
  }
  tags: {
    environment: 'production'
    application: 'frontend'
  }
}

output staticWebAppId string = staticWebApp.id
output defaultHostname string = staticWebApp.properties.defaultHostname
output staticWebAppName string = staticWebApp.name
```

The `Standard` SKU is needed for custom domains with SSL, the managed Functions API, and additional features like custom authentication providers. The `Free` tier works for personal projects but has limitations.

## Adding Custom Domains

Custom domains in Static Web Apps require DNS validation. There are two approaches: CNAME validation for subdomains and TXT validation for apex (root) domains.

```bicep
// custom-domains.bicep
// Configures custom domains with automatic SSL certificates

@description('The Static Web App name')
param staticWebAppName string

@description('Primary custom domain (e.g., www.example.com)')
param primaryDomain string = 'www.example.com'

@description('Apex domain (e.g., example.com)')
param apexDomain string = 'example.com'

// Reference the existing Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' existing = {
  name: staticWebAppName
}

// Custom domain for www subdomain (CNAME validation)
resource wwwDomain 'Microsoft.Web/staticSites/customDomains@2022-09-01' = {
  parent: staticWebApp
  name: primaryDomain
  properties: {
    // CNAME validation - point DNS CNAME record to the default hostname
    validationMethod: 'cname-delegation'
  }
}

// Custom domain for apex/root domain (TXT validation required)
resource apexDomainResource 'Microsoft.Web/staticSites/customDomains@2022-09-01' = {
  parent: staticWebApp
  name: apexDomain
  properties: {
    // DNS TXT record validation for apex domains
    validationMethod: 'dns-txt-token'
  }
}

output wwwDomainStatus string = wwwDomain.properties.status
output apexDomainStatus string = apexDomainResource.properties.status
output validationToken string = apexDomainResource.properties.validationToken
```

Before deploying the custom domain resources, you need to configure the DNS records at your registrar or DNS provider.

For the www subdomain, create a CNAME record.

```
www.example.com  CNAME  <default-hostname>.azurestaticapps.net
```

For the apex domain, create a TXT record for validation, then an ALIAS or A record pointing to the Static Web App.

```
# Validation TXT record
example.com  TXT  <validation-token-from-output>

# After validation, point to the app
example.com  ALIAS  <default-hostname>.azurestaticapps.net
```

## App Settings and Environment Variables

Static Web Apps support application settings that are available to the API backend.

```bicep
// settings.bicep
// Configures application settings for the Static Web App

@description('Static Web App name')
param staticWebAppName string

@description('API Key for the backend service')
@secure()
param apiKey string

@description('Database connection string')
@secure()
param dbConnectionString string

// Reference the Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' existing = {
  name: staticWebAppName
}

// Application settings
resource appSettings 'Microsoft.Web/staticSites/config@2022-09-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    API_KEY: apiKey
    DATABASE_CONNECTION_STRING: dbConnectionString
    NODE_ENV: 'production'
    API_BASE_URL: 'https://api.example.com'
  }
}
```

## Linked Azure Functions Backend

If your API is hosted separately in an Azure Functions app, you can link it to the Static Web App.

```bicep
// linked-backend.bicep
// Links an existing Azure Functions app as the API backend

@description('Static Web App name')
param staticWebAppName string

@description('Resource ID of the Azure Functions app')
param functionAppId string

@description('Azure region for the linked backend')
param location string = resourceGroup().location

resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' existing = {
  name: staticWebAppName
}

// Link the Functions app as the API backend
resource linkedBackend 'Microsoft.Web/staticSites/linkedBackends@2022-09-01' = {
  parent: staticWebApp
  name: 'backend'
  properties: {
    backendResourceId: functionAppId
    region: location
  }
}
```

## Configuration File

Static Web Apps use a `staticwebapp.config.json` file in the repository for routing, authentication, and header configuration. While this file lives in the repo (not in Bicep), it is worth documenting the structure here.

```json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    },
    {
      "route": "/admin/*",
      "allowedRoles": ["admin"]
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/api/*", "/images/*", "/*.css", "/*.js"]
  },
  "responseOverrides": {
    "401": {
      "statusCode": 302,
      "redirect": "/.auth/login/aad"
    },
    "404": {
      "rewrite": "/404.html"
    }
  },
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self'",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
  },
  "mimeTypes": {
    ".wasm": "application/wasm",
    ".json": "application/json"
  }
}
```

## Full Deployment Orchestration

Bring everything together in a main deployment file.

```bicep
// deploy.bicep
// Full deployment of Static Web App with custom domains and settings

@description('Environment name')
param environment string = 'production'

@secure()
param repositoryToken string

@secure()
param apiKey string

@secure()
param dbConnectionString string

// Deploy the Static Web App
module staticApp 'modules/static-web-app.bicep' = {
  name: 'deploy-static-web-app'
  params: {
    appName: 'swa-myapp-${environment}'
    sku: environment == 'production' ? 'Standard' : 'Free'
    repositoryUrl: 'https://github.com/your-org/frontend-app'
    branch: environment == 'production' ? 'main' : 'develop'
    repositoryToken: repositoryToken
  }
}

// Configure custom domains (only for production)
module customDomains 'modules/custom-domains.bicep' = if (environment == 'production') {
  name: 'deploy-custom-domains'
  params: {
    staticWebAppName: staticApp.outputs.staticWebAppName
    primaryDomain: 'www.example.com'
    apexDomain: 'example.com'
  }
}

// Configure app settings
module settings 'modules/settings.bicep' = {
  name: 'deploy-settings'
  params: {
    staticWebAppName: staticApp.outputs.staticWebAppName
    apiKey: apiKey
    dbConnectionString: dbConnectionString
  }
}

output appUrl string = environment == 'production' ? 'https://www.example.com' : 'https://${staticApp.outputs.defaultHostname}'
```

Deploy with the Azure CLI.

```bash
# Deploy the full stack
az deployment group create \
  --resource-group rg-frontend-prod \
  --template-file deploy.bicep \
  --parameters environment='production' \
               repositoryToken='ghp_xxxx' \
               apiKey='your-api-key' \
               dbConnectionString='Server=...'
```

## Monitoring

Add diagnostic settings to track traffic and errors.

```bicep
// diagnostics.bicep
resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'swa-diagnostics'
  scope: staticWebApp
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        category: 'StaticSiteErrors'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}
```

## Summary

Bicep templates give you a complete, repeatable way to deploy Azure Static Web Apps with custom domains. The key pieces are the Static Web App resource with its build configuration, custom domain resources with proper DNS validation, application settings for the API backend, and optional linked backends for separate Functions apps. With everything defined in Bicep, you can deploy identical frontend hosting setups across environments and manage the entire lifecycle through infrastructure as code.
