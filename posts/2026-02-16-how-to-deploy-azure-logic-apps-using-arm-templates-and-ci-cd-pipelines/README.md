# How to Deploy Azure Logic Apps Using ARM Templates and CI/CD Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Logic Apps, ARM Templates, CI/CD, DevOps, Infrastructure as Code, Azure DevOps

Description: A complete guide to exporting Logic Apps as ARM templates, parameterizing them for multiple environments, and deploying them through CI/CD pipelines.

---

Building Logic Apps in the portal is great for prototyping, but it falls apart when you need to promote workflows across environments, track changes, roll back broken deployments, or have multiple team members working on the same integration. The solution is treating your Logic Apps as infrastructure as code: export them as ARM templates, parameterize the environment-specific values, store them in source control, and deploy them through CI/CD pipelines.

In this post, I will walk through the entire process from exporting an existing Logic App to deploying it automatically through Azure DevOps and GitHub Actions.

## Exporting a Logic App as an ARM Template

### From the Portal

The quickest way to get an ARM template from an existing Logic App:

1. Open your Logic App in the portal
2. Click "Export template" in the left navigation under Automation
3. Click "Download" to get the template and parameters file

This gives you two files:
- **template.json** - the full ARM template with the Logic App definition
- **parameters.json** - the parameter values

### From the CLI

```bash
# Export the Logic App resource as an ARM template
az group export \
  --resource-group rg-workflows \
  --resource-ids "/subscriptions/<sub-id>/resourceGroups/rg-workflows/providers/Microsoft.Logic/workflows/la-approval-workflow" \
  --output json > template.json
```

## Parameterizing the Template

The exported template will have hardcoded values that need to change between environments: connection strings, API endpoints, email addresses, storage accounts, and so on. Replace these with parameters.

### Before (Hardcoded)

```json
{
  "type": "Microsoft.Logic/workflows",
  "name": "la-approval-workflow",
  "location": "eastus",
  "properties": {
    "definition": {
      "actions": {
        "Send_Email": {
          "inputs": {
            "body": {
              "To": "ops-team@company.com"
            }
          }
        }
      }
    }
  }
}
```

### After (Parameterized)

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "logicAppName": {
      "type": "string",
      "metadata": {
        "description": "Name of the Logic App"
      }
    },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]"
    },
    "notificationEmail": {
      "type": "string",
      "metadata": {
        "description": "Email address for notifications"
      }
    },
    "environment": {
      "type": "string",
      "allowedValues": ["dev", "staging", "production"],
      "metadata": {
        "description": "Deployment environment"
      }
    }
  },
  "resources": [
    {
      "type": "Microsoft.Logic/workflows",
      "apiVersion": "2019-05-01",
      "name": "[parameters('logicAppName')]",
      "location": "[parameters('location')]",
      "properties": {
        "definition": {
          "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
          "triggers": {
            "manual": {
              "type": "Request",
              "kind": "Http",
              "inputs": {
                "schema": {}
              }
            }
          },
          "actions": {
            "Send_Email": {
              "type": "ApiConnection",
              "inputs": {
                "body": {
                  "To": "[parameters('notificationEmail')]"
                }
              }
            }
          }
        }
      }
    }
  ]
}
```

### Handling API Connections

API connections (connectors for Office 365, SQL Server, Salesforce, etc.) are separate Azure resources. They need their own ARM template definitions and must be deployed before the Logic App that references them.

```json
{
  "resources": [
    {
      "type": "Microsoft.Web/connections",
      "apiVersion": "2016-06-01",
      "name": "[variables('office365ConnectionName')]",
      "location": "[parameters('location')]",
      "properties": {
        "displayName": "Office 365 Connection",
        "api": {
          "id": "[subscriptionResourceId('Microsoft.Web/locations/managedApis', parameters('location'), 'office365')]"
        }
      }
    },
    {
      "type": "Microsoft.Logic/workflows",
      "apiVersion": "2019-05-01",
      "name": "[parameters('logicAppName')]",
      "location": "[parameters('location')]",
      "dependsOn": [
        "[resourceId('Microsoft.Web/connections', variables('office365ConnectionName'))]"
      ],
      "properties": {
        "parameters": {
          "$connections": {
            "value": {
              "office365": {
                "connectionId": "[resourceId('Microsoft.Web/connections', variables('office365ConnectionName'))]",
                "connectionName": "[variables('office365ConnectionName')]",
                "id": "[subscriptionResourceId('Microsoft.Web/locations/managedApis', parameters('location'), 'office365')]"
              }
            }
          }
        },
        "definition": {
          "...": "workflow definition"
        }
      }
    }
  ]
}
```

Note: API connections that use OAuth (like Office 365) require a manual authorization step after deployment. The ARM template creates the connection resource, but someone needs to authorize it in the portal the first time. After that, subsequent deployments reuse the existing authorized connection.

## Environment-Specific Parameter Files

Create a parameter file for each environment:

**parameters.dev.json:**
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "logicAppName": { "value": "la-approval-workflow-dev" },
    "notificationEmail": { "value": "dev-team@company.com" },
    "environment": { "value": "dev" }
  }
}
```

**parameters.production.json:**
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "logicAppName": { "value": "la-approval-workflow" },
    "notificationEmail": { "value": "ops-team@company.com" },
    "environment": { "value": "production" }
  }
}
```

## Deploying with Azure CLI

Test your template deployment before setting up CI/CD:

```bash
# Validate the template without actually deploying
az deployment group validate \
  --resource-group rg-workflows-dev \
  --template-file template.json \
  --parameters @parameters.dev.json

# Deploy to the dev environment
az deployment group create \
  --resource-group rg-workflows-dev \
  --template-file template.json \
  --parameters @parameters.dev.json \
  --name "logic-app-deploy-$(date +%Y%m%d-%H%M%S)"
```

## CI/CD with Azure DevOps

### Repository Structure

```
logic-apps/
  approval-workflow/
    template.json
    parameters.dev.json
    parameters.staging.json
    parameters.production.json
  data-sync/
    template.json
    parameters.dev.json
    parameters.production.json
azure-pipelines.yml
```

### Azure DevOps Pipeline

Here is a complete pipeline that deploys a Logic App across three environments with manual approval gates:

```yaml
# azure-pipelines.yml
# Pipeline for deploying Logic Apps across environments

trigger:
  branches:
    include:
      - main
  paths:
    include:
      - logic-apps/**

pool:
  vmImage: 'ubuntu-latest'

stages:
  # Deploy to dev automatically on every merge to main
  - stage: DeployDev
    displayName: 'Deploy to Dev'
    jobs:
      - deployment: DeployLogicApp
        environment: 'dev'
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - task: AzureResourceManagerTemplateDeployment@3
                  displayName: 'Deploy Logic App to Dev'
                  inputs:
                    azureResourceManagerConnection: 'azure-service-connection'
                    subscriptionId: '$(subscriptionId)'
                    resourceGroupName: 'rg-workflows-dev'
                    location: 'East US'
                    templateLocation: 'Linked artifact'
                    csmFile: 'logic-apps/approval-workflow/template.json'
                    csmParametersFile: 'logic-apps/approval-workflow/parameters.dev.json'
                    deploymentMode: 'Incremental'

  # Deploy to staging with manual approval
  - stage: DeployStaging
    displayName: 'Deploy to Staging'
    dependsOn: DeployDev
    condition: succeeded()
    jobs:
      - deployment: DeployLogicApp
        environment: 'staging'
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - task: AzureResourceManagerTemplateDeployment@3
                  displayName: 'Deploy Logic App to Staging'
                  inputs:
                    azureResourceManagerConnection: 'azure-service-connection'
                    subscriptionId: '$(subscriptionId)'
                    resourceGroupName: 'rg-workflows-staging'
                    location: 'East US'
                    templateLocation: 'Linked artifact'
                    csmFile: 'logic-apps/approval-workflow/template.json'
                    csmParametersFile: 'logic-apps/approval-workflow/parameters.staging.json'
                    deploymentMode: 'Incremental'

  # Deploy to production with manual approval
  - stage: DeployProduction
    displayName: 'Deploy to Production'
    dependsOn: DeployStaging
    condition: succeeded()
    jobs:
      - deployment: DeployLogicApp
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - task: AzureResourceManagerTemplateDeployment@3
                  displayName: 'Deploy Logic App to Production'
                  inputs:
                    azureResourceManagerConnection: 'azure-service-connection'
                    subscriptionId: '$(subscriptionId)'
                    resourceGroupName: 'rg-workflows-prod'
                    location: 'East US'
                    templateLocation: 'Linked artifact'
                    csmFile: 'logic-apps/approval-workflow/template.json'
                    csmParametersFile: 'logic-apps/approval-workflow/parameters.production.json'
                    deploymentMode: 'Incremental'
```

## CI/CD with GitHub Actions

If your team uses GitHub instead of Azure DevOps:

```yaml
# .github/workflows/deploy-logic-app.yml
name: Deploy Logic App

on:
  push:
    branches: [main]
    paths: ['logic-apps/**']

jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      # Validate the template before deploying
      - name: Validate ARM Template
        uses: azure/arm-deploy@v1
        with:
          subscriptionId: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          resourceGroupName: rg-workflows-dev
          template: logic-apps/approval-workflow/template.json
          parameters: logic-apps/approval-workflow/parameters.dev.json
          deploymentMode: Validate

      # Deploy to dev
      - name: Deploy to Dev
        uses: azure/arm-deploy@v1
        with:
          subscriptionId: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          resourceGroupName: rg-workflows-dev
          template: logic-apps/approval-workflow/template.json
          parameters: logic-apps/approval-workflow/parameters.dev.json
          deploymentMode: Incremental

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-dev
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to Production
        uses: azure/arm-deploy@v1
        with:
          subscriptionId: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          resourceGroupName: rg-workflows-prod
          template: logic-apps/approval-workflow/template.json
          parameters: logic-apps/approval-workflow/parameters.production.json
          deploymentMode: Incremental
```

## Handling Secrets in Parameters

Never commit secrets to your parameter files. For sensitive values like API keys or connection strings, use Azure Key Vault references:

```json
{
  "parameters": {
    "apiKey": {
      "reference": {
        "keyVault": {
          "id": "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.KeyVault/vaults/<vault-name>"
        },
        "secretName": "external-api-key"
      }
    }
  }
}
```

The deployment process fetches the secret from Key Vault at deploy time, so it never appears in your source code or pipeline logs.

## Testing Before Deployment

Add a validation step to your pipeline that catches template errors before deployment:

```bash
# Validate the template syntax and parameter types
az deployment group validate \
  --resource-group rg-workflows-dev \
  --template-file template.json \
  --parameters @parameters.dev.json

# Run a what-if deployment to see what will change
az deployment group what-if \
  --resource-group rg-workflows-dev \
  --template-file template.json \
  --parameters @parameters.dev.json
```

The what-if operation shows you exactly what resources will be created, modified, or deleted without actually making any changes. This is extremely valuable for catching unintended side effects.

## Wrapping Up

Deploying Logic Apps through ARM templates and CI/CD pipelines transforms them from portal-only curiosities into proper, production-grade infrastructure. The key steps are parameterization (so the same template works across environments), source control (so you have history and can collaborate), and automated deployment (so promotions are repeatable and auditable). Start by exporting your most critical Logic App, parameterize it, and set up a basic pipeline. Then expand to cover your other Logic Apps as you become comfortable with the workflow.
