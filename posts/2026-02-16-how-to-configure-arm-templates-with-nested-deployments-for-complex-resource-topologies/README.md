# How to Configure ARM Templates with Nested Deployments for Complex Resource Topologies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ARM Templates, Azure, Nested Deployments, Infrastructure as Code, Azure Resource Manager, DevOps, Cloud Architecture

Description: Learn how to structure ARM templates with nested and linked deployments to manage complex Azure resource topologies cleanly and maintainably.

---

ARM templates handle simple deployments well. One resource group, a handful of resources, a single template file. But real-world infrastructure is rarely that simple. You might need to deploy resources across multiple resource groups, create dependencies between dozens of interconnected resources, or compose reusable template modules that different teams can share. That is where nested and linked deployments come in.

Nested deployments let you call one ARM template from within another. This gives you modularity (break a big deployment into smaller pieces), scope flexibility (deploy to different resource groups or subscriptions), and reusability (share common templates across projects). In this post, I will walk through how to structure ARM templates with nested deployments for complex topologies.

## Understanding Nested vs. Linked Deployments

The terms get used interchangeably, but there is a technical difference:

- **Nested deployment (inline)**: The child template is defined inline within the parent template. Everything is in a single file.
- **Linked deployment**: The child template is a separate file referenced by URL. The parent template points to the child template's location (usually in a storage account or a public URL).

Both use the `Microsoft.Resources/deployments` resource type. The choice between them depends on whether you want everything in one file or prefer separate, reusable template files.

## Basic Nested Deployment Structure

Here is the simplest form of a nested deployment. The child template is defined inline in the parent:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": {
      "type": "string",
      "defaultValue": "dev"
    },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]"
    }
  },
  "resources": [
    {
      "type": "Microsoft.Resources/deployments",
      "apiVersion": "2022-09-01",
      "name": "networkDeployment",
      "properties": {
        "mode": "Incremental",
        "template": {
          "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
          "contentVersion": "1.0.0.0",
          "resources": [
            {
              "type": "Microsoft.Network/virtualNetworks",
              "apiVersion": "2023-05-01",
              "name": "[concat('vnet-', parameters('environment'))]",
              "location": "[parameters('location')]",
              "properties": {
                "addressSpace": {
                  "addressPrefixes": ["10.0.0.0/16"]
                },
                "subnets": [
                  {
                    "name": "web-subnet",
                    "properties": {
                      "addressPrefix": "10.0.1.0/24"
                    }
                  },
                  {
                    "name": "app-subnet",
                    "properties": {
                      "addressPrefix": "10.0.2.0/24"
                    }
                  }
                ]
              }
            }
          ],
          "outputs": {
            "vnetId": {
              "type": "string",
              "value": "[resourceId('Microsoft.Network/virtualNetworks', concat('vnet-', parameters('environment')))]"
            },
            "webSubnetId": {
              "type": "string",
              "value": "[resourceId('Microsoft.Network/virtualNetworks/subnets', concat('vnet-', parameters('environment')), 'web-subnet')]"
            }
          }
        }
      }
    },
    {
      "type": "Microsoft.Resources/deployments",
      "apiVersion": "2022-09-01",
      "name": "computeDeployment",
      "dependsOn": [
        "networkDeployment"
      ],
      "properties": {
        "mode": "Incremental",
        "template": {
          "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
          "contentVersion": "1.0.0.0",
          "resources": [
            {
              "type": "Microsoft.Web/serverfarms",
              "apiVersion": "2023-01-01",
              "name": "[concat('plan-', parameters('environment'))]",
              "location": "[parameters('location')]",
              "sku": {
                "name": "B1"
              },
              "kind": "linux",
              "properties": {
                "reserved": true
              }
            }
          ]
        }
      }
    }
  ]
}
```

## Linked Deployments with Separate Template Files

For production use, linked deployments are better because they keep templates modular and reusable. Each component gets its own file:

```
templates/
    main.json              (orchestrator)
    networking.json         (VNet, subnets, NSGs)
    compute.json           (VMs, App Service)
    storage.json           (Storage accounts)
    monitoring.json        (Log Analytics, alerts)
```

The main template links to the others:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": {
      "type": "string"
    },
    "templateBaseUri": {
      "type": "string",
      "metadata": {
        "description": "Base URI for linked templates (storage account URL)"
      }
    },
    "templateSasToken": {
      "type": "secureString",
      "metadata": {
        "description": "SAS token for accessing linked templates"
      }
    }
  },
  "resources": [
    {
      "type": "Microsoft.Resources/deployments",
      "apiVersion": "2022-09-01",
      "name": "networkDeployment",
      "properties": {
        "mode": "Incremental",
        "templateLink": {
          "uri": "[concat(parameters('templateBaseUri'), 'networking.json', parameters('templateSasToken'))]",
          "contentVersion": "1.0.0.0"
        },
        "parameters": {
          "environment": {
            "value": "[parameters('environment')]"
          }
        }
      }
    },
    {
      "type": "Microsoft.Resources/deployments",
      "apiVersion": "2022-09-01",
      "name": "computeDeployment",
      "dependsOn": ["networkDeployment"],
      "properties": {
        "mode": "Incremental",
        "templateLink": {
          "uri": "[concat(parameters('templateBaseUri'), 'compute.json', parameters('templateSasToken'))]",
          "contentVersion": "1.0.0.0"
        },
        "parameters": {
          "environment": {
            "value": "[parameters('environment')]"
          },
          "subnetId": {
            "value": "[reference('networkDeployment').outputs.webSubnetId.value]"
          }
        }
      }
    }
  ]
}
```

## Hosting Linked Templates

Linked templates must be accessible via a URL. The common approaches are:

### Azure Storage Account with SAS Token

```bash
# Create a storage account and container for templates
az storage account create --name armtemplates --resource-group templates-rg --sku Standard_LRS
az storage container create --name templates --account-name armtemplates

# Upload template files
az storage blob upload-batch \
  --destination templates \
  --account-name armtemplates \
  --source ./templates/

# Generate a SAS token for the container (valid for 1 hour)
SAS=$(az storage container generate-sas \
  --name templates \
  --account-name armtemplates \
  --permissions r \
  --expiry $(date -u -d "+1 hour" +%Y-%m-%dT%H:%M:%SZ) \
  --output tsv)

# Deploy using the storage account URL and SAS token
az deployment group create \
  --resource-group myapp-rg \
  --template-file main.json \
  --parameters \
    environment=dev \
    templateBaseUri="https://armtemplates.blob.core.windows.net/templates/" \
    templateSasToken="?${SAS}"
```

### Template Specs

Azure Template Specs let you store templates as first-class Azure resources without needing a storage account:

```bash
# Create a template spec from a local file
az ts create \
  --name networking-module \
  --version 1.0.0 \
  --resource-group templates-rg \
  --location eastus \
  --template-file networking.json

# Reference a template spec in a deployment
# Use the template spec resource ID instead of a URL
```

## Cross-Resource-Group Deployments

One of the most powerful features of nested deployments is the ability to deploy resources to different resource groups from a single orchestrating template:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "networkResourceGroup": {
      "type": "string",
      "defaultValue": "network-rg"
    },
    "appResourceGroup": {
      "type": "string",
      "defaultValue": "app-rg"
    }
  },
  "resources": [
    {
      "type": "Microsoft.Resources/deployments",
      "apiVersion": "2022-09-01",
      "name": "networkDeploy",
      "resourceGroup": "[parameters('networkResourceGroup')]",
      "properties": {
        "mode": "Incremental",
        "template": {
          "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
          "contentVersion": "1.0.0.0",
          "resources": [
            {
              "type": "Microsoft.Network/virtualNetworks",
              "apiVersion": "2023-05-01",
              "name": "shared-vnet",
              "location": "eastus",
              "properties": {
                "addressSpace": {
                  "addressPrefixes": ["10.0.0.0/16"]
                }
              }
            }
          ]
        }
      }
    },
    {
      "type": "Microsoft.Resources/deployments",
      "apiVersion": "2022-09-01",
      "name": "appDeploy",
      "resourceGroup": "[parameters('appResourceGroup')]",
      "dependsOn": ["networkDeploy"],
      "properties": {
        "mode": "Incremental",
        "template": {
          "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
          "contentVersion": "1.0.0.0",
          "resources": [
            {
              "type": "Microsoft.Web/serverfarms",
              "apiVersion": "2023-01-01",
              "name": "app-plan",
              "location": "eastus",
              "sku": {
                "name": "B1"
              }
            }
          ]
        }
      }
    }
  ]
}
```

Deploy this at the subscription level:

```bash
az deployment sub create \
  --location eastus \
  --template-file main.json \
  --parameters networkResourceGroup=network-rg appResourceGroup=app-rg
```

## Passing Outputs Between Nested Deployments

The most common pattern is passing outputs from one nested deployment to another. The network deployment outputs subnet IDs that the compute deployment needs:

```json
{
  "type": "Microsoft.Resources/deployments",
  "name": "computeDeployment",
  "dependsOn": ["networkDeployment"],
  "properties": {
    "mode": "Incremental",
    "template": { },
    "parameters": {
      "subnetId": {
        "value": "[reference('networkDeployment').outputs.webSubnetId.value]"
      },
      "vnetId": {
        "value": "[reference('networkDeployment').outputs.vnetId.value]"
      }
    }
  }
}
```

The `reference()` function with a deployment name gives you access to its outputs. This creates an implicit dependency, but I recommend adding explicit `dependsOn` for clarity.

## Deployment Modes: Incremental vs. Complete

Nested deployments almost always use Incremental mode. Complete mode deletes resources that are not in the template, which can be dangerous in nested scenarios where each template only defines a subset of resources.

```json
{
  "properties": {
    "mode": "Incremental"
  }
}
```

Only use Complete mode at the top level if you want the template to be the single source of truth for the entire resource group. Never use Complete mode in nested deployments.

## Debugging Nested Deployment Failures

When a nested deployment fails, the error can be buried several levels deep. Use the Azure CLI to dig into deployment details:

```bash
# List all deployments in a resource group
az deployment group list --resource-group myapp-rg --output table

# Get details of a specific deployment, including nested operations
az deployment group show \
  --resource-group myapp-rg \
  --name main-deployment

# Show deployment operations to find the failure point
az deployment operation group list \
  --resource-group myapp-rg \
  --name main-deployment \
  --output table
```

## Wrapping Up

Nested and linked deployments transform ARM templates from single-file configurations into modular, composable infrastructure definitions. Use linked deployments for reusable modules, cross-resource-group deployments for complex topologies, and output passing for inter-component dependencies. While Bicep modules offer a more modern syntax for the same patterns, ARM templates with nested deployments remain the foundation and understanding them helps you work effectively with both approaches.
