# How to Deploy Azure Logic Apps Standard with Workflow Definitions in Bicep

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Logic Apps, Bicep, Infrastructure as Code, Serverless, Workflows, Automation

Description: Learn how to deploy Azure Logic Apps Standard with embedded workflow definitions using Bicep templates for repeatable, version-controlled automation.

---

Azure Logic Apps Standard is a powerful platform for building integration workflows. Unlike the Consumption plan, the Standard tier runs on the Azure App Service platform and supports stateful and stateless workflows in a single logic app resource. This makes it a solid choice for enterprise integration scenarios where you need more control over hosting, networking, and performance.

Deploying Logic Apps Standard through Bicep gives you a repeatable, declarative way to manage these resources alongside your other Azure infrastructure. In this post, we will walk through how to set up a Logic Apps Standard resource with embedded workflow definitions entirely in Bicep.

## Why Use Bicep for Logic Apps Standard

Logic Apps Standard resources are essentially Azure App Service sites with some special configuration. Their workflows are defined as JSON files in the underlying storage. When you manage everything in Bicep, you get several benefits:

- Version control for your workflow definitions alongside your infrastructure code
- Consistent deployments across environments (dev, staging, production)
- No manual portal clicking to recreate workflows after infrastructure changes
- Easy integration with CI/CD pipelines

The alternative is deploying the Logic App resource separately and then pushing workflow definitions via the Azure CLI or REST API. That works fine, but having everything in one Bicep template simplifies the pipeline considerably.

## Prerequisites

Before diving in, you will need:

- Azure CLI installed with Bicep support (version 2.20.0 or later)
- An Azure subscription with permissions to create resources
- Basic familiarity with Bicep syntax and ARM template concepts

## Setting Up the Foundation Resources

Logic Apps Standard requires a storage account for workflow state and an App Service Plan. Let us start with those foundational resources.

The following Bicep template creates the storage account and App Service Plan that the Logic App will depend on.

```bicep
// Parameters for configurable deployment
param location string = resourceGroup().location
param appNamePrefix string = 'logicapp'
param storageSku string = 'Standard_LRS'

// Generate a unique suffix based on the resource group ID
var uniqueSuffix = uniqueString(resourceGroup().id)
var storageAccountName = '${appNamePrefix}stor${uniqueSuffix}'
var appServicePlanName = '${appNamePrefix}-plan-${uniqueSuffix}'
var logicAppName = '${appNamePrefix}-${uniqueSuffix}'

// Storage account for Logic App workflow state and artifacts
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: storageSku
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

// App Service Plan using the Workflow Standard SKU
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'WS1'       // Workflow Standard 1 - the smallest tier
    tier: 'WorkflowStandard'
  }
  properties: {
    maximumElasticWorkerCount: 20
    isSpot: false
    reserved: false    // Set to true for Linux-based Logic Apps
  }
}
```

The `WS1` SKU is specific to Logic Apps Standard. It is part of the WorkflowStandard tier and provides dedicated compute for your workflows. You can scale up to WS2 or WS3 for heavier workloads.

## Deploying the Logic App Resource

With the foundation in place, let us add the Logic App Standard resource itself. This is a `Microsoft.Web/sites` resource with the `kind` set to a workflow-specific value.

```bicep
// Logic App Standard resource
resource logicApp 'Microsoft.Web/sites@2023-01-01' = {
  name: logicAppName
  location: location
  kind: 'functionapp,workflowapp'   // This kind identifies it as Logic Apps Standard
  identity: {
    type: 'SystemAssigned'          // Managed identity for secure access
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      netFrameworkVersion: 'v6.0'
      appSettings: [
        {
          // Connection string to the storage account
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          // Required for Logic Apps Standard runtime
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          // Runtime worker configuration
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          // Identifies this as a Logic App
          name: 'APP_KIND'
          value: 'workflowApp'
        }
        {
          // Storage content share for workflows
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(logicAppName)
        }
      ]
    }
  }
}
```

The `kind` property value of `functionapp,workflowapp` is critical. Without it, Azure will treat the resource as a regular Function App. The `APP_KIND` setting in the app settings reinforces this classification.

## Embedding Workflow Definitions

Here is where things get interesting. Logic Apps Standard stores workflows as JSON files within the app's file system. Each workflow lives in its own directory under the root. You can deploy these definitions using the `Microsoft.Web/sites/extensions` resource type with the `MSDeploy` extension, but a simpler approach is to use the `sourcecontrols` or to include workflows via app settings and deployment scripts.

However, the cleanest Bicep-native approach is using the `config` sub-resource to set workflow-related configuration and then deploying workflow definition files as part of your CI/CD pipeline. Let me show you a practical middle ground - defining the workflow as a Bicep variable and deploying it through a deployment script.

```bicep
// Workflow definition as a Bicep variable
var httpTriggerWorkflow = {
  definition: {
    '$schema': 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#'
    actions: {
      Response: {
        inputs: {
          body: {
            message: 'Hello from Logic Apps Standard deployed via Bicep!'
            timestamp: '@utcNow()'
          }
          statusCode: 200
        }
        kind: 'http'
        type: 'Response'
      }
    }
    contentVersion: '1.0.0.0'
    outputs: {}
    triggers: {
      manual: {
        inputs: {}
        kind: 'Http'
        type: 'Request'
      }
    }
  }
  kind: 'Stateless'
}

// Deploy the workflow definition using a deployment script
resource deployWorkflow 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  name: 'deploy-workflow-definitions'
  location: location
  kind: 'AzureCLI'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      // You would reference a user-assigned managed identity here
    }
  }
  properties: {
    azCliVersion: '2.50.0'
    retentionInterval: 'PT1H'
    scriptContent: '''
      # Upload the workflow definition to the Logic App
      az rest --method PUT \
        --url "https://management.azure.com${LOGIC_APP_ID}/hostruntime/admin/vfs/HttpTriggerWorkflow/workflow.json?api-version=2023-01-01" \
        --body @workflow.json \
        --headers "Content-Type=application/json"
    '''
    environmentVariables: [
      {
        name: 'LOGIC_APP_ID'
        value: logicApp.id
      }
    ]
  }
}
```

## A More Practical Approach - File-Based Deployment

In real-world projects, most teams keep workflow definitions as separate JSON files alongside their Bicep templates and deploy them using the Azure CLI in their CI/CD pipeline. Here is what that directory structure typically looks like:

```
infrastructure/
  main.bicep
  parameters.dev.json
  parameters.prod.json
workflows/
  HttpTriggerWorkflow/
    workflow.json
  OrderProcessing/
    workflow.json
  DataSync/
    workflow.json
deploy.sh
```

The deployment script handles both the infrastructure and the workflow files.

```bash
#!/bin/bash
# deploy.sh - Deploy Logic Apps Standard with workflow definitions

RESOURCE_GROUP="rg-logicapps-prod"
LOGIC_APP_NAME="logicapp-prod-abc123"

# Step 1: Deploy the Bicep template for infrastructure
az deployment group create \
  --resource-group $RESOURCE_GROUP \
  --template-file infrastructure/main.bicep \
  --parameters @infrastructure/parameters.prod.json

# Step 2: Compress workflow definitions into a zip
cd workflows
zip -r ../workflows.zip .
cd ..

# Step 3: Deploy workflow files to the Logic App
az logicapp deployment source config-zip \
  --name $LOGIC_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src workflows.zip

echo "Deployment complete."
```

## Adding Connections and API References

Most Logic App workflows connect to external services. These connections are defined in a `connections.json` file at the root of the Logic App. You can also include managed API connections as Bicep resources.

```bicep
// API connection for Office 365 (example)
resource office365Connection 'Microsoft.Web/connections@2016-06-01' = {
  name: 'office365-connection'
  location: location
  properties: {
    api: {
      id: subscriptionResourceId('Microsoft.Web/locations/managedApis', location, 'office365')
    }
    displayName: 'Office 365 Connection'
    parameterValues: {}   // Authentication happens post-deployment via consent
  }
}
```

After creating the API connection resource, you reference it in your workflow's `connections.json` file so the workflow actions can use it.

## Environment-Specific Configuration

One of the best patterns for managing Logic Apps Standard across environments is using Bicep parameter files combined with app settings for environment-specific values.

```bicep
// Parameters for environment-specific configuration
param environment string = 'dev'
param serviceEndpoint string

// Set environment-specific app settings on the Logic App
resource logicAppSettings 'Microsoft.Web/sites/config@2023-01-01' = {
  parent: logicApp
  name: 'appsettings'
  properties: {
    // Standard required settings (same as above, abbreviated)
    AzureWebJobsStorage: '...'
    FUNCTIONS_EXTENSION_VERSION: '~4'
    // Environment-specific values workflows can reference
    SERVICE_ENDPOINT: serviceEndpoint
    ENVIRONMENT_NAME: environment
    // Feature flags
    ENABLE_RETRY_POLICY: environment == 'prod' ? 'true' : 'false'
  }
}
```

Inside your workflow definitions, you reference these values using `@appsetting('SERVICE_ENDPOINT')` expressions. This lets you keep the same workflow definition across all environments while changing behavior through configuration.

## Monitoring and Diagnostics

Do not forget to add diagnostic settings to capture workflow run history and metrics.

```bicep
// Log Analytics workspace for monitoring
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${appNamePrefix}-logs-${uniqueSuffix}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Diagnostic settings for the Logic App
resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  scope: logicApp
  name: 'logicapp-diagnostics'
  properties: {
    workspaceId: logAnalytics.id
    logs: [
      {
        category: 'WorkflowRuntime'
        enabled: true
        retentionPolicy: {
          days: 30
          enabled: true
        }
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

## Deployment Command

Once everything is assembled, deploy with a single command.

```bash
# Deploy the complete Logic Apps Standard setup
az deployment group create \
  --resource-group rg-logicapps-dev \
  --template-file main.bicep \
  --parameters appNamePrefix='mylogicapp' \
  --parameters location='eastus2'
```

## Common Pitfalls

A few things to watch out for when deploying Logic Apps Standard with Bicep:

1. **Storage account naming** - Storage accounts have a 24-character limit and must be globally unique. Using `uniqueString()` helps but keep your prefix short.
2. **SKU selection** - The `WS1` SKU is the entry point. Do not confuse it with regular App Service SKUs like `S1`.
3. **Missing app settings** - Forgetting `APP_KIND` or `FUNCTIONS_EXTENSION_VERSION` will cause the Logic App designer to not recognize the resource properly.
4. **Workflow deployment order** - Always deploy the infrastructure first, then the workflow files. The Logic App runtime needs to be running before it can accept workflow definitions.

## Wrapping Up

Deploying Azure Logic Apps Standard with Bicep gives you a solid, repeatable infrastructure setup. The key is understanding that Logic Apps Standard is built on the App Service platform, so many patterns from Function Apps and Web Apps apply directly. Keep your workflow definitions in source control alongside your Bicep templates, use parameter files for environment differences, and deploy everything through a CI/CD pipeline. This approach scales well from simple HTTP-triggered workflows to complex enterprise integration scenarios with dozens of interconnected workflows.
