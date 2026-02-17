# How to Implement Azure Policy to Enforce Diagnostic Settings on All Azure Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Policy, Diagnostic Settings, Monitoring, Compliance, Log Analytics, Azure Monitor

Description: Learn how to use Azure Policy with DeployIfNotExists to automatically configure diagnostic settings on Azure resources and ensure all logs flow to your monitoring workspace.

---

Every Azure resource can generate diagnostic logs - activity logs, metrics, audit trails - but none of them are collected by default. You have to explicitly configure diagnostic settings on each resource to send logs to a Log Analytics workspace, storage account, or Event Hub. In a growing environment, this creates an obvious problem: resources get deployed without diagnostic settings, and you end up with blind spots in your monitoring and security posture.

Azure Policy with the DeployIfNotExists effect solves this by automatically deploying diagnostic settings on resources that do not have them. When a new resource is created without the correct diagnostic configuration, the policy triggers a remediation that adds it automatically. In this post, I will show you how to set this up at scale.

## The Problem with Manual Diagnostic Settings

Imagine this scenario: a developer creates a new Azure SQL Database for a project. They set up the schema, connect their application, and everything works. But they did not configure diagnostic logs. Six months later, when the security team needs to investigate an incident involving that database, there are no logs. The activity data is gone forever because it was never collected.

This happens all the time. The fix is to remove the human from the loop and let policy handle diagnostic settings automatically.

## Step 1: Understand What Diagnostic Settings Cover

Before configuring policies, let us understand what we are collecting. Different Azure resource types generate different categories of diagnostic data:

| Resource Type | Log Categories |
|--------------|---------------|
| Azure SQL Database | SQLInsights, AutomaticTuning, QueryStoreRuntimeStatistics, Errors, DatabaseWaitStatistics |
| Key Vault | AuditEvent |
| Storage Account | StorageRead, StorageWrite, StorageDelete |
| App Service | AppServiceHTTPLogs, AppServiceConsoleLogs, AppServiceAppLogs |
| Azure Firewall | AzureFirewallApplicationRule, AzureFirewallNetworkRule |
| Network Security Group | NetworkSecurityGroupEvent, NetworkSecurityGroupRuleCounter |

The policy needs to be specific to each resource type because the log categories differ. This means you will need multiple policy assignments - one per resource type.

## Step 2: Use Built-In Policy Definitions

Azure provides built-in policy definitions for configuring diagnostic settings on many resource types. These use the DeployIfNotExists effect, which means they will automatically deploy the diagnostic settings when a non-compliant resource is found.

First, let us find the available built-in policies for diagnostic settings:

```bash
# List built-in diagnostic settings policies
az policy definition list \
  --query "[?contains(displayName,'diagnostic') && policyType=='BuiltIn' && contains(metadata.category,'Monitoring')].{name:name, displayName:displayName}" \
  -o table | head -30
```

You will see dozens of policies, one for each resource type. Some commonly used ones include:

- "Deploy Diagnostic Settings for Key Vault to Log Analytics workspace"
- "Deploy Diagnostic Settings for Azure SQL Database to Log Analytics workspace"
- "Deploy Diagnostic Settings for Network Security Groups"

## Step 3: Create a Policy Initiative (Policy Set)

Rather than assigning individual policies one by one, group them into a policy initiative. This makes management much cleaner.

This creates an initiative that bundles diagnostic settings policies for multiple resource types:

```bash
# Create a custom policy initiative for diagnostic settings
# First, get the definition IDs for the policies you want to include
KV_POLICY=$(az policy definition list \
  --query "[?contains(displayName,'Deploy Diagnostic Settings for Key Vault to Log Analytics')].name" -o tsv)

SQL_POLICY=$(az policy definition list \
  --query "[?contains(displayName,'Deploy Diagnostic Settings for Azure SQL Database to Log Analytics')].name" -o tsv)

# Create the initiative definition
az policy set-definition create \
  --name "diagnostic-settings-initiative" \
  --display-name "Deploy Diagnostic Settings for All Resource Types" \
  --description "Ensures all supported resource types have diagnostic settings configured to send logs to a central Log Analytics workspace" \
  --definitions "[
    {\"policyDefinitionId\":\"/providers/Microsoft.Authorization/policyDefinitions/$KV_POLICY\",\"parameters\":{\"logAnalytics\":{\"value\":\"[parameters('logAnalyticsWorkspace')]\"}}},
    {\"policyDefinitionId\":\"/providers/Microsoft.Authorization/policyDefinitions/$SQL_POLICY\",\"parameters\":{\"logAnalytics\":{\"value\":\"[parameters('logAnalyticsWorkspace')]\"}}}
  ]" \
  --params '{
    "logAnalyticsWorkspace": {
      "type": "String",
      "metadata": {
        "displayName": "Log Analytics Workspace",
        "description": "The resource ID of the Log Analytics workspace to send diagnostic logs to"
      }
    }
  }'
```

## Step 4: Create a Custom Policy for Resource Types Without Built-In Definitions

Some resource types do not have built-in diagnostic settings policies. For those, you need custom policy definitions. Here is a template for creating a custom DeployIfNotExists policy.

This is a custom policy definition that deploys diagnostic settings on Azure App Service Web Apps:

```json
{
    "mode": "Indexed",
    "policyRule": {
        "if": {
            "field": "type",
            "equals": "Microsoft.Web/sites"
        },
        "then": {
            "effect": "DeployIfNotExists",
            "details": {
                "type": "Microsoft.Insights/diagnosticSettings",
                "name": "setByPolicy",
                "existenceCondition": {
                    "allOf": [
                        {
                            "field": "Microsoft.Insights/diagnosticSettings/logs.enabled",
                            "equals": "true"
                        },
                        {
                            "field": "Microsoft.Insights/diagnosticSettings/workspaceId",
                            "equals": "[parameters('logAnalytics')]"
                        }
                    ]
                },
                "roleDefinitionIds": [
                    "/providers/Microsoft.Authorization/roleDefinitions/749f88d5-cbae-40b8-bcfc-e573ddc772fa",
                    "/providers/Microsoft.Authorization/roleDefinitions/92aaf0da-9dab-42b6-94a3-d43ce8d16293"
                ],
                "deployment": {
                    "properties": {
                        "mode": "incremental",
                        "template": {
                            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
                            "contentVersion": "1.0.0.0",
                            "parameters": {
                                "resourceName": { "type": "string" },
                                "logAnalytics": { "type": "string" },
                                "location": { "type": "string" }
                            },
                            "resources": [
                                {
                                    "type": "Microsoft.Web/sites/providers/diagnosticSettings",
                                    "apiVersion": "2021-05-01-preview",
                                    "name": "[concat(parameters('resourceName'), '/Microsoft.Insights/setByPolicy')]",
                                    "location": "[parameters('location')]",
                                    "properties": {
                                        "workspaceId": "[parameters('logAnalytics')]",
                                        "logs": [
                                            {
                                                "category": "AppServiceHTTPLogs",
                                                "enabled": true
                                            },
                                            {
                                                "category": "AppServiceConsoleLogs",
                                                "enabled": true
                                            },
                                            {
                                                "category": "AppServiceAppLogs",
                                                "enabled": true
                                            },
                                            {
                                                "category": "AppServiceAuditLogs",
                                                "enabled": true
                                            }
                                        ],
                                        "metrics": [
                                            {
                                                "category": "AllMetrics",
                                                "enabled": true
                                            }
                                        ]
                                    }
                                }
                            ]
                        },
                        "parameters": {
                            "resourceName": { "value": "[field('name')]" },
                            "logAnalytics": { "value": "[parameters('logAnalytics')]" },
                            "location": { "value": "[field('location')]" }
                        }
                    }
                }
            }
        }
    },
    "parameters": {
        "logAnalytics": {
            "type": "String",
            "metadata": {
                "displayName": "Log Analytics workspace",
                "description": "Target Log Analytics workspace resource ID"
            }
        }
    }
}
```

Save this as a JSON file and create the policy definition:

```bash
# Create the custom policy definition
az policy definition create \
  --name "deploy-diag-appservice" \
  --display-name "Deploy Diagnostic Settings for App Service to Log Analytics" \
  --description "Automatically configures diagnostic settings on App Service web apps" \
  --rules /path/to/policy-rule.json \
  --mode Indexed
```

## Step 5: Assign the Policy Initiative

Assign the initiative at your desired scope. For organization-wide coverage, assign at the management group level.

This assigns the initiative with the required parameters and managed identity:

```bash
# Get the Log Analytics workspace resource ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group rg-monitoring \
  --workspace-name law-central \
  --query id -o tsv)

# Assign the initiative at the subscription level
az policy assignment create \
  --name "enforce-diagnostic-settings" \
  --display-name "Enforce Diagnostic Settings on All Resources" \
  --policy-set-definition "diagnostic-settings-initiative" \
  --scope "/subscriptions/$(az account show --query id -o tsv)" \
  --mi-system-assigned \
  --location eastus \
  --params "{\"logAnalyticsWorkspace\":{\"value\":\"$WORKSPACE_ID\"}}"
```

The `--mi-system-assigned` flag is critical. DeployIfNotExists policies need a managed identity to perform the remediation deployments. Without it, the policy can evaluate compliance but cannot fix non-compliant resources.

## Step 6: Grant the Managed Identity Required Permissions

The managed identity created by the policy assignment needs appropriate permissions to deploy diagnostic settings.

```bash
# Get the managed identity principal ID from the policy assignment
PRINCIPAL_ID=$(az policy assignment show \
  --name "enforce-diagnostic-settings" \
  --query identity.principalId -o tsv)

# Grant Monitoring Contributor role (needed to create diagnostic settings)
az role assignment create \
  --assignee-object-id $PRINCIPAL_ID \
  --assignee-principal-type ServicePrincipal \
  --role "Monitoring Contributor" \
  --scope "/subscriptions/$(az account show --query id -o tsv)"

# Grant Log Analytics Contributor role (needed to write to the workspace)
az role assignment create \
  --assignee-object-id $PRINCIPAL_ID \
  --assignee-principal-type ServicePrincipal \
  --role "Log Analytics Contributor" \
  --scope "/subscriptions/$(az account show --query id -o tsv)"
```

## Step 7: Remediate Existing Resources

The policy will automatically apply to new resources as they are created, but existing non-compliant resources need a remediation task.

This triggers remediation for all non-compliant resources:

```bash
# Create a remediation task for each policy in the initiative
az policy remediation create \
  --name "remediate-kv-diagnostics" \
  --policy-assignment "enforce-diagnostic-settings" \
  --definition-reference-id "<policy-definition-reference-id>" \
  --resource-group rg-production

# For subscription-level remediation
az policy remediation create \
  --name "remediate-all-diagnostics" \
  --policy-assignment "enforce-diagnostic-settings" \
  --resource-discovery-mode ReEvaluateCompliance
```

Monitor the remediation progress:

```bash
# Check remediation task status
az policy remediation show \
  --name "remediate-all-diagnostics" \
  --query "{status:provisioningState, totalResources:deploymentStatus.totalDeployments, successful:deploymentStatus.successfulDeployments, failed:deploymentStatus.failedDeployments}"
```

## Step 8: Monitor Compliance

After the initial remediation, monitor ongoing compliance to catch any issues.

This KQL query shows the compliance state of diagnostic settings across your subscription:

```kusto
// Check diagnostic settings compliance across resource types
PolicyStates_CL
| where TimeGenerated > ago(1d)
| where PolicyDefinitionAction_s == "DeployIfNotExists"
| where PolicyDefinitionCategory_s == "Monitoring"
| summarize
    Compliant = countif(ComplianceState_s == "Compliant"),
    NonCompliant = countif(ComplianceState_s == "NonCompliant")
    by PolicyDefinitionName_s
| extend CompliancePercent = round(100.0 * Compliant / (Compliant + NonCompliant), 1)
| order by CompliancePercent asc
```

## Common Issues and Solutions

**Remediation fails with "Authorization Failed"** - The managed identity does not have sufficient permissions. Check that it has Monitoring Contributor and the appropriate resource-type contributor role.

**Policy shows compliant but logs are not flowing** - The diagnostic setting might exist but be configured incorrectly (wrong workspace, wrong log categories). Check the existenceCondition in the policy to make sure it validates the right properties.

**Some resource types are not covered** - Not every Azure resource type supports diagnostic settings. Check the Azure documentation for your specific resource type. If it is not supported, you may need to use alternative monitoring approaches.

**Duplicate diagnostic settings** - If you have multiple policies or manual settings, you might end up with duplicate diagnostic configurations. This is usually harmless (data is sent twice), but it can increase costs. Use a consistent naming convention for policy-deployed settings (like "setByPolicy") to avoid conflicts.

## Wrapping Up

Enforcing diagnostic settings through Azure Policy is one of the most impactful governance measures you can implement. It eliminates the monitoring blind spots that inevitably occur when diagnostic configuration is left to individual teams. The DeployIfNotExists effect handles both new resources and existing ones through remediation tasks, giving you comprehensive coverage. Start with the most critical resource types - Key Vault, databases, network security groups - and expand from there. The goal is simple: every resource that can generate diagnostic logs should be sending them to your central monitoring workspace, automatically, without anyone having to remember to configure it.
