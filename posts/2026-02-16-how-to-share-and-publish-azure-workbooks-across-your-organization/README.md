# How to Share and Publish Azure Workbooks Across Your Organization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Workbooks, Sharing, Publishing, Collaboration, Azure Monitor, Templates

Description: Learn how to share and publish Azure Workbooks across your organization using shared reports, templates, and ARM templates for consistent monitoring experiences.

---

You have built a great Azure Workbook that shows exactly the right data with interactive parameters and clean visualizations. Now what? If it is sitting in your personal "My Reports" folder, only you can see it. To get value from Workbooks at an organizational level, you need to share them effectively. Azure provides several mechanisms for this, from simple shared reports to full-blown template galleries.

In this post, I will cover all the ways to share and publish Azure Workbooks, including shared reports, template publishing, ARM template exports, and gallery contributions.

## Understanding Workbook Storage

Azure Workbooks can be saved in two places:

**My Reports (Private)** - Only you can see and edit these. They are stored in your user profile and tied to your Azure AD identity. Use these for personal experimentation and works in progress.

**Shared Reports (Shared)** - Saved as Azure resources in a resource group. Anyone with the appropriate RBAC permissions can view and edit them. Use these for team and organizational Workbooks.

When you save a Workbook, you are prompted to choose between these two options. For anything you want to share, always choose "Shared Reports."

## Saving as a Shared Report

### From the Portal

1. Open your Workbook
2. Click "Save As" in the toolbar
3. Enter a name for the Workbook
4. Select "Shared Reports"
5. Choose a subscription and resource group
6. Click Save

The Workbook is now an Azure resource of type `microsoft.insights/workbooks`. It shows up in the resource group and can be managed with RBAC like any other Azure resource.

### Setting RBAC on Shared Workbooks

Once saved as a shared report, you control access through Azure RBAC:

```bash
# Grant a team read access to a shared Workbook
az role assignment create \
    --assignee "team-group-id" \
    --role "Workbook Reader" \
    --scope "/subscriptions/sub-id/resourceGroups/monitoring-rg/providers/microsoft.insights/workbooks/workbook-id"

# Grant edit access
az role assignment create \
    --assignee "editor-group-id" \
    --role "Workbook Contributor" \
    --scope "/subscriptions/sub-id/resourceGroups/monitoring-rg/providers/microsoft.insights/workbooks/workbook-id"
```

The built-in roles for Workbooks are:
- **Workbook Reader** - Can view shared Workbooks
- **Workbook Contributor** - Can create, edit, and delete shared Workbooks
- **Monitoring Reader** - Can also view Workbooks (broader role)
- **Monitoring Contributor** - Can also edit Workbooks (broader role)

For most teams, granting Monitoring Reader at the resource group level is the simplest approach. This gives everyone read access to all Workbooks in that resource group.

## Creating Workbook Templates

Templates are Workbooks that are designed to be reusable starting points. Unlike shared Workbooks, templates do not contain data - they contain the structure, queries, and visualizations that users instantiate with their own data sources.

### Building a Template

Design your Workbook with parameterization in mind:

1. Use parameters for all variable elements (workspace, subscription, resource group)
2. Do not hard-code resource IDs or workspace names
3. Add clear descriptions for each parameter
4. Include markdown instructions for how to use the template

### Saving as a Template

When you save, you can choose to save as a template instead of a regular Workbook. Templates are saved with the type `microsoft.insights/workbooktemplates` and appear in the Workbook gallery for your resource group or subscription.

```bash
# Create a Workbook template using Azure CLI
az monitor workbook create \
    --resource-group "monitoring-rg" \
    --name "my-template" \
    --display-name "Infrastructure Health Template" \
    --category "Infrastructure" \
    --kind "shared" \
    --source-id "/subscriptions/sub-id/resourceGroups/monitoring-rg" \
    --serialized-data @workbook-template.json
```

## Exporting Workbooks as ARM Templates

For infrastructure-as-code workflows, you can export Workbooks as ARM templates and deploy them through your CI/CD pipeline.

### Export from the Portal

1. Open the shared Workbook
2. Click the edit icon (pencil)
3. Click the "Advanced Editor" button (</>)
4. Copy the JSON content

### Create an ARM Template

Wrap the Workbook JSON in an ARM template:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "workbookName": {
      "type": "string",
      "defaultValue": "Infrastructure Health Dashboard"
    },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]"
    }
  },
  "resources": [
    {
      // Workbook resource definition
      "type": "microsoft.insights/workbooks",
      "apiVersion": "2022-04-01",
      "name": "[guid(parameters('workbookName'))]",
      "location": "[parameters('location')]",
      "kind": "shared",
      "properties": {
        "displayName": "[parameters('workbookName')]",
        "category": "workbook",
        "version": "1.0",
        // Paste your serialized Workbook JSON here
        "serializedData": "{\"version\":\"Notebook/1.0\",\"items\":[{\"type\":1,\"content\":{\"json\":\"# Infrastructure Health\"},\"name\":\"title\"}],\"isLocked\":false}"
      }
    }
  ]
}
```

### Deploy the Workbook

```bash
# Deploy the Workbook ARM template
az deployment group create \
    --resource-group "monitoring-rg" \
    --template-file "workbook-template.json" \
    --parameters workbookName="Infrastructure Health v2"
```

## Managing Workbooks with Bicep

Bicep provides a cleaner syntax for Workbook deployment:

```bicep
// Parameters
param workbookName string = 'Infrastructure Health Dashboard'
param location string = resourceGroup().location

// Load the workbook content from a JSON file
var workbookContent = loadTextContent('workbook-content.json')

resource workbook 'microsoft.insights/workbooks@2022-04-01' = {
  name: guid(workbookName, resourceGroup().id)
  location: location
  kind: 'shared'
  properties: {
    displayName: workbookName
    category: 'workbook'
    version: '1.0'
    serializedData: workbookContent
  }
}

output workbookId string = workbook.id
```

This approach lets you keep the Workbook content in a separate JSON file and reference it from Bicep, making version control easier.

## Publishing to the Workbook Gallery

The Workbook gallery is the default view users see when they click on "Workbooks" in Azure Monitor. You can contribute templates to this gallery.

### Resource-Scoped Gallery Contributions

When you save a Workbook template associated with a specific resource type, it appears in the gallery for that resource type. For example, a Workbook template associated with virtual machines will appear when users navigate to a VM's Monitoring section and click Workbooks.

### Community Gallery Contributions

Microsoft accepts community contributions to the built-in Workbook gallery through their GitHub repository. This is the way to share Workbooks with the broader Azure community:

1. Fork the `microsoft/Application-Insights-Workbooks` repository
2. Add your Workbook template in the appropriate category folder
3. Include a README with description and screenshots
4. Submit a pull request

## Version Control for Workbooks

Since Workbooks are JSON under the hood, they work well with version control:

```bash
# Export a Workbook to a JSON file
az monitor workbook show \
    --resource-group "monitoring-rg" \
    --name "workbook-resource-name" \
    --query "properties.serializedData" \
    --output tsv > workbooks/infra-health.json

# Import/update a Workbook from a JSON file
az monitor workbook update \
    --resource-group "monitoring-rg" \
    --name "workbook-resource-name" \
    --serialized-data @workbooks/infra-health.json
```

Store these JSON files in your team's Git repository alongside your infrastructure code. Use pull requests for review before deploying changes.

## Organizing Workbooks for Your Team

### Folder Structure

Create a logical structure for your shared Workbooks using resource groups or naming conventions:

- `monitoring-rg` / `workbooks-infra` - Infrastructure Workbooks
- `monitoring-rg` / `workbooks-app` - Application Workbooks
- `monitoring-rg` / `workbooks-security` - Security Workbooks

### Naming Conventions

Use consistent naming: `[Team]-[Purpose]-[Version]`

Examples:
- SRE-VM-Health-v2
- Security-SignIn-Analysis-v1
- AppTeam-OrderService-Metrics-v3

### Documentation

For each Workbook, include:
- What it shows and who it is for
- Which data sources it requires (Log Analytics workspaces, resource types)
- How to use the parameters
- Who maintains it

This documentation can live as a markdown text block at the top of the Workbook itself.

## Sharing via Links

For quick sharing, you can copy the direct URL to a shared Workbook:

1. Open the Workbook
2. Copy the URL from the browser address bar
3. Share via email, Teams, or documentation

Anyone with the appropriate RBAC permissions can open the link and see the Workbook.

You can also create deep links that pre-set parameter values:

```
https://portal.azure.com/#blade/AppInsightsExtension/UsageNotebookBlade/ComponentId/...&TimeRange=P1D&Computer=Server1
```

## Automating Workbook Deployment

For organizations that need to deploy the same Workbooks across many subscriptions:

```powershell
# Deploy Workbooks to multiple subscriptions
$subscriptions = @(
    "sub-1",
    "sub-2",
    "sub-3"
)

$templateFile = "workbook-arm-template.json"

foreach ($sub in $subscriptions) {
    Write-Output "Deploying to subscription $sub..."
    az deployment group create `
        --subscription $sub `
        --resource-group "monitoring-rg" `
        --template-file $templateFile `
        --parameters workbookName="Standard Infrastructure Dashboard" `
        --no-wait
}
```

## Best Practices

**Save as Shared Reports early.** Do not build an elaborate Workbook in My Reports and then try to share it later. Start with Shared Reports.

**Use resource groups for access boundaries.** Put Workbooks in resource groups that match your access model.

**Version your Workbooks in Git.** Export the JSON and check it in. This gives you history, review, and rollback capabilities.

**Include documentation in the Workbook.** Add markdown blocks that explain what each section shows and how to use the parameters.

**Test after sharing.** Log in as another user to verify they can access the Workbook and that all queries work with their permissions.

**Review shared Workbooks quarterly.** Stale Workbooks with broken queries create confusion. Clean them up regularly.

## Summary

Sharing Azure Workbooks effectively requires understanding the different storage options (private vs. shared), RBAC controls, template mechanisms, and deployment tools. For small teams, shared reports with proper RBAC are sufficient. For larger organizations, combine ARM or Bicep templates with CI/CD pipelines to deploy consistent Workbooks across multiple subscriptions. Always version control your Workbook definitions and document their purpose and usage.
