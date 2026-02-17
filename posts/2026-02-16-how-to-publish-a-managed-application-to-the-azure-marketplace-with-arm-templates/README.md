# How to Publish a Managed Application to the Azure Marketplace with ARM Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Marketplace, ARM Templates, Managed Applications, SaaS, ISV, Cloud Deployment, Azure

Description: A step-by-step guide to publishing a managed application to the Azure Marketplace using ARM templates and Partner Center.

---

If you have built a solution on Azure and want to distribute it to other organizations, the Azure Marketplace is the most direct path. Managed applications are a specific offer type that lets you deploy infrastructure into a customer's Azure subscription while retaining management access. The customer gets your solution running in their environment, and you get ongoing access to manage, update, and support it.

The core of a managed application is a pair of ARM templates: one that defines the UI the customer sees during deployment, and another that defines the actual Azure resources. In this guide, I will walk through the entire process of building, packaging, and publishing a managed application to the Azure Marketplace.

## Understanding Managed Applications

Before diving into the templates, it is worth understanding what makes managed applications different from other Marketplace offers:

- **Solution templates** deploy resources into the customer's subscription with no ongoing management access. Once deployed, the customer owns everything.
- **Managed applications** also deploy into the customer's subscription, but into a managed resource group that you (the publisher) retain access to. The customer can see the resources but cannot modify them directly.
- **SaaS offers** are hosted entirely in your infrastructure, with the customer just getting access to your service.

Managed applications sit in the middle. The customer's data stays in their subscription (important for compliance), but you maintain the ability to push updates, troubleshoot issues, and manage the infrastructure.

## Creating the ARM Deployment Template

The `mainTemplate.json` file defines what Azure resources get deployed. Here is an example that deploys a web application with a SQL database:

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "appName": {
            "type": "string",
            "metadata": {
                "description": "Name of the web application"
            }
        },
        "sqlAdminPassword": {
            "type": "securestring",
            "metadata": {
                "description": "Password for the SQL Server administrator"
            }
        },
        "appServicePlanSku": {
            "type": "string",
            "defaultValue": "S1",
            "allowedValues": ["S1", "S2", "P1v2"],
            "metadata": {
                "description": "The pricing tier for the App Service plan"
            }
        }
    },
    "variables": {
        "appServicePlanName": "[concat(parameters('appName'), '-plan')]",
        "sqlServerName": "[concat(parameters('appName'), '-sql')]",
        "sqlDatabaseName": "[concat(parameters('appName'), '-db')]",
        "location": "[resourceGroup().location]"
    },
    "resources": [
        {
            "type": "Microsoft.Web/serverfarms",
            "apiVersion": "2022-03-01",
            "name": "[variables('appServicePlanName')]",
            "location": "[variables('location')]",
            "sku": {
                "name": "[parameters('appServicePlanSku')]"
            },
            "properties": {}
        },
        {
            "type": "Microsoft.Web/sites",
            "apiVersion": "2022-03-01",
            "name": "[parameters('appName')]",
            "location": "[variables('location')]",
            "dependsOn": [
                "[resourceId('Microsoft.Web/serverfarms', variables('appServicePlanName'))]"
            ],
            "properties": {
                "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', variables('appServicePlanName'))]",
                "siteConfig": {
                    "appSettings": [
                        {
                            "name": "SQL_CONNECTION_STRING",
                            "value": "[concat('Server=tcp:', variables('sqlServerName'), '.database.windows.net,1433;Database=', variables('sqlDatabaseName'), ';')]"
                        }
                    ]
                }
            }
        },
        {
            "type": "Microsoft.Sql/servers",
            "apiVersion": "2022-05-01-preview",
            "name": "[variables('sqlServerName')]",
            "location": "[variables('location')]",
            "properties": {
                "administratorLogin": "sqladmin",
                "administratorLoginPassword": "[parameters('sqlAdminPassword')]"
            },
            "resources": [
                {
                    "type": "databases",
                    "apiVersion": "2022-05-01-preview",
                    "name": "[variables('sqlDatabaseName')]",
                    "location": "[variables('location')]",
                    "dependsOn": [
                        "[resourceId('Microsoft.Sql/servers', variables('sqlServerName'))]"
                    ],
                    "sku": {
                        "name": "S0",
                        "tier": "Standard"
                    },
                    "properties": {}
                }
            ]
        }
    ],
    "outputs": {
        "webAppUrl": {
            "type": "string",
            "value": "[concat('https://', parameters('appName'), '.azurewebsites.net')]"
        }
    }
}
```

## Creating the UI Definition

The `createUiDefinition.json` file controls the deployment wizard that customers see in the Azure portal. It defines the steps, input fields, and validation:

```json
{
    "$schema": "https://schema.management.azure.com/schemas/0.1.2-preview/CreateUIDefinition.MultiVm.json#",
    "handler": "Microsoft.Azure.CreateUIDef",
    "version": "0.1.2-preview",
    "parameters": {
        "basics": [
            {
                "name": "appName",
                "type": "Microsoft.Common.TextBox",
                "label": "Application Name",
                "toolTip": "Name for the web application. Must be globally unique.",
                "constraints": {
                    "required": true,
                    "regex": "^[a-z0-9-]{3,24}$",
                    "validationMessage": "Must be 3-24 lowercase letters, numbers, or hyphens."
                }
            }
        ],
        "steps": [
            {
                "name": "databaseConfig",
                "label": "Database Configuration",
                "elements": [
                    {
                        "name": "sqlAdminPassword",
                        "type": "Microsoft.Common.PasswordBox",
                        "label": {
                            "password": "SQL Admin Password",
                            "confirmPassword": "Confirm Password"
                        },
                        "toolTip": "Password for the SQL Server administrator account.",
                        "constraints": {
                            "required": true,
                            "regex": "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@#$%^&*]).{12,}$",
                            "validationMessage": "Must be at least 12 characters with uppercase, lowercase, number, and special character."
                        }
                    }
                ]
            },
            {
                "name": "appServiceConfig",
                "label": "App Service Configuration",
                "elements": [
                    {
                        "name": "appServicePlanSku",
                        "type": "Microsoft.Common.DropDown",
                        "label": "App Service Plan Tier",
                        "defaultValue": "Standard S1",
                        "constraints": {
                            "required": true,
                            "allowedValues": [
                                { "label": "Standard S1", "value": "S1" },
                                { "label": "Standard S2", "value": "S2" },
                                { "label": "Premium P1v2", "value": "P1v2" }
                            ]
                        }
                    }
                ]
            }
        ],
        "outputs": {
            "appName": "[basics('appName')]",
            "sqlAdminPassword": "[steps('databaseConfig').sqlAdminPassword]",
            "appServicePlanSku": "[steps('appServiceConfig').appServicePlanSku]"
        }
    }
}
```

## Packaging the Application

The managed application package is a ZIP file containing both templates. Package it like this:

```bash
# Create the application package
cd /path/to/your/templates

# Validate the ARM template first
az deployment group validate \
  --resource-group rg-test \
  --template-file mainTemplate.json \
  --parameters appName=testapp sqlAdminPassword=TestP@ssw0rd123

# Package the templates into a ZIP file
zip app.zip mainTemplate.json createUiDefinition.json

# Upload the package to a storage account for the Marketplace
az storage blob upload \
  --account-name stmarketplacepackages \
  --container-name packages \
  --name myapp/v1.0.0/app.zip \
  --file app.zip \
  --auth-mode login
```

## Testing Locally Before Publishing

Before submitting to the Marketplace, test the UI definition using the Azure portal sandbox:

```bash
# Generate a URL to test the createUiDefinition.json in the portal
ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote(open('createUiDefinition.json').read()))")

echo "https://portal.azure.com/#blade/Microsoft_Azure_CreateUIDef/SandboxBlade/content/$ENCODED"
```

Open this URL in your browser to see the deployment wizard exactly as customers will experience it. Verify that all fields, validation rules, and steps work correctly.

## Setting Up Partner Center

To publish on the Azure Marketplace, you need a Partner Center account. Here is the process:

1. Register as a Microsoft partner at partner.microsoft.com if you have not already.
2. Navigate to the Commercial Marketplace section in Partner Center.
3. Create a new offer of type "Azure Application".
4. Select "Managed application" as the plan type.

The Partner Center listing requires several pieces of information:

- Offer name and description
- Categories (up to three)
- Search keywords
- Support and engineering contact information
- Publisher and privacy URLs
- Screenshots and marketing images

## Configuring the Technical Plan

In Partner Center, the technical configuration for your managed application plan needs:

```
Plan name: Standard
Plan ID: standard-plan
Version: 1.0.0
Package file: app.zip (uploaded earlier)
Publisher tenant ID: your Azure AD tenant ID
Authorizations:
  - Principal ID: your management group or user object ID
  - Role: Contributor (or a custom role with limited permissions)
```

The authorization section is critical. It defines who in your organization can access the managed resource group in the customer's subscription. Follow the principle of least privilege - do not use Owner unless absolutely necessary.

## Defining Publisher Access

You can create a custom role definition that gives you exactly the permissions you need:

```json
{
    "Name": "Managed App Operator",
    "Description": "Custom role for managed application publisher access",
    "Actions": [
        "Microsoft.Web/sites/read",
        "Microsoft.Web/sites/restart/action",
        "Microsoft.Web/sites/config/read",
        "Microsoft.Web/sites/config/write",
        "Microsoft.Sql/servers/databases/read",
        "Microsoft.Insights/metrics/read",
        "Microsoft.Insights/diagnosticSettings/*",
        "Microsoft.Resources/deployments/*"
    ],
    "NotActions": [],
    "AssignableScopes": [
        "/subscriptions/{your-subscription-id}"
    ]
}
```

This role lets you read app configuration, restart the web app, manage diagnostics, and deploy updates - but not delete resources or access the SQL admin password.

## Publishing and Certification

After submitting your offer, Microsoft runs a certification process that checks:

- ARM template validity and best practices
- UI definition compliance
- No hard-coded credentials or connection strings
- Proper use of secure parameters for sensitive values
- Documentation and support information completeness

The certification typically takes 3-5 business days. If there are issues, you will get feedback through Partner Center with specific items to fix.

## Updating Your Managed Application

Once published, you can push updates to all deployed instances. Create a new version of your package with the updated templates, upload it to Partner Center, and increment the version number. Customers receive a notification that an update is available, and depending on your configuration, it can be applied automatically or require customer approval.

## Wrapping Up

Publishing a managed application to the Azure Marketplace involves several moving parts - ARM templates, UI definitions, packaging, Partner Center configuration, and certification. But once you have the pipeline set up, it becomes a repeatable process for shipping updates and new features. The key advantage of managed applications over other offer types is the ongoing management access: you can monitor, troubleshoot, and update customer deployments without requiring them to do anything. For ISVs building infrastructure-heavy solutions, this is a compelling distribution model that balances customer control with publisher manageability.
