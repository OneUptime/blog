# How to Set Up Azure Monitor Diagnostic Settings to Stream Logs to a Log Analytics Workspace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Monitor, Diagnostic Settings, Log Analytics, Azure Logging, Cloud Monitoring, Azure Infrastructure

Description: Learn how to configure Azure Monitor diagnostic settings to stream platform logs and metrics into a Log Analytics workspace for centralized analysis.

---

If you have been running workloads on Azure for any length of time, you have probably noticed that most resources generate logs and metrics by default - but they do not go anywhere useful unless you tell them to. That is where diagnostic settings come in. They are the bridge between an Azure resource and a destination like a Log Analytics workspace where you can actually query the data.

In this guide, I will walk through how to set up diagnostic settings so that platform logs from your Azure resources stream into a Log Analytics workspace. We will cover the portal approach, the Azure CLI method, and infrastructure-as-code with ARM templates.

## Why Stream Logs to Log Analytics?

Azure resources produce two broad categories of telemetry: platform metrics (numeric time-series data like CPU percentage) and platform logs (structured event records like audit trails, request logs, and error records). Platform metrics are automatically collected and stored for 93 days, but platform logs are discarded unless you route them somewhere.

Log Analytics is the most common destination because it gives you full KQL (Kusto Query Language) access to your data. You can join logs from multiple resources, build dashboards, set up alerts, and export results. Other destinations include Azure Storage (for long-term archiving) and Event Hubs (for streaming to external systems), but Log Analytics is typically the starting point.

## Prerequisites

Before configuring diagnostic settings, make sure you have:

- An Azure subscription with at least Contributor access on the resource you want to monitor.
- A Log Analytics workspace. If you do not have one, create it first.
- The resource you want to stream logs from (a VM, App Service, Key Vault, SQL Database, or any supported resource).

## Step 1: Create a Log Analytics Workspace

If you already have a workspace, skip this step. Otherwise, here is how to create one using the Azure CLI.

```bash
# Create a resource group if you do not have one
az group create --name rg-monitoring --location eastus

# Create the Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group rg-monitoring \
  --workspace-name law-central \
  --location eastus \
  --sku PerGB2018
```

The `PerGB2018` SKU is the pay-as-you-go pricing tier, which is the standard for most workloads. Take note of the workspace resource ID from the output - you will need it later.

## Step 2: Configure Diagnostic Settings via the Azure Portal

1. Navigate to the Azure resource you want to monitor (for example, an App Service).
2. In the left menu, under **Monitoring**, click **Diagnostic settings**.
3. Click **Add diagnostic setting**.
4. Give it a name like `stream-to-law`.
5. Under **Logs**, check the log categories you want. For an App Service, this typically includes `AppServiceHTTPLogs`, `AppServiceConsoleLogs`, `AppServiceAppLogs`, and `AppServiceAuditLogs`.
6. Under **Metrics**, check **AllMetrics** if you want metric data in the workspace too.
7. Under **Destination details**, check **Send to Log Analytics workspace** and select your workspace.
8. Click **Save**.

That is it from the portal side. Within a few minutes, logs will start flowing into your workspace.

## Step 3: Configure Diagnostic Settings via Azure CLI

The portal is fine for one-off setups, but if you manage dozens of resources, the CLI is faster. Here is an example for an Azure Key Vault.

```bash
# Get the resource ID of your Key Vault
KEYVAULT_ID=$(az keyvault show --name my-keyvault --query id -o tsv)

# Get the workspace resource ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group rg-monitoring \
  --workspace-name law-central \
  --query id -o tsv)

# Create the diagnostic setting
az monitor diagnostic-settings create \
  --name "kv-to-law" \
  --resource "$KEYVAULT_ID" \
  --workspace "$WORKSPACE_ID" \
  --logs '[{"category":"AuditEvent","enabled":true},{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

The `--logs` parameter accepts a JSON array of log categories or category groups. Using `allLogs` as a category group is a convenient shorthand that captures every log category the resource supports.

## Step 4: Configure with an ARM Template

For repeatable infrastructure deployments, ARM templates or Bicep are the way to go. Here is an ARM template snippet for a diagnostic setting on a storage account.

```json
{
  "type": "Microsoft.Insights/diagnosticSettings",
  "apiVersion": "2021-05-01-preview",
  "scope": "[resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName'))]",
  "name": "storage-diag",
  "properties": {
    "workspaceId": "[parameters('workspaceResourceId')]",
    "logs": [
      {
        "categoryGroup": "allLogs",
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
```

The key thing to notice is the `scope` property. Diagnostic settings are child resources of the resource being monitored, so the scope must reference the parent resource.

## Step 5: Verify Logs Are Flowing

After setting up diagnostic settings, give it 5 to 10 minutes for data to appear. Then open your Log Analytics workspace and run a simple query.

```
// Check which tables have received data recently
search *
| where TimeGenerated > ago(30m)
| summarize count() by $table
| order by count_ desc
```

You should see tables corresponding to the log categories you enabled. For example, Key Vault audit logs land in the `AzureDiagnostics` table (for resources using legacy mode) or in resource-specific tables like `AZKVAuditLogs` (for resources that support resource-specific mode).

## Resource-Specific vs. Azure Diagnostics Mode

This is a detail that trips people up. Older Azure resources send all their logs to a single `AzureDiagnostics` table. Newer resources support resource-specific mode, where each log category gets its own dedicated table.

Resource-specific mode is better because:

- Each table has a well-defined schema (no generic columns).
- Queries are faster and simpler.
- You can set different retention policies per table.

When you create a diagnostic setting in the portal, you may see an option to choose the destination table format. Always pick **Resource specific** when available.

## Automating Diagnostic Settings at Scale

If you have hundreds of resources, manually creating diagnostic settings is not practical. A common pattern is to use Azure Policy to automatically apply diagnostic settings to every resource of a given type. Azure provides built-in policy definitions like "Deploy Diagnostic Settings for Key Vault to Log Analytics workspace" that you can assign at the subscription or management group level.

Here is how to assign one via the CLI.

```bash
# Find the built-in policy definition for Key Vault diagnostics
POLICY_DEF=$(az policy definition list \
  --query "[?contains(displayName, 'Deploy Diagnostic Settings for Key Vault')].name" \
  -o tsv | head -1)

# Assign the policy to your subscription
az policy assignment create \
  --name "kv-diag-policy" \
  --policy "$POLICY_DEF" \
  --scope "/subscriptions/<your-subscription-id>" \
  --params "{\"logAnalytics\": {\"value\": \"$WORKSPACE_ID\"}}" \
  --assign-identity \
  --location eastus
```

The `--assign-identity` flag creates a managed identity for the policy so it can create diagnostic settings on your behalf using a remediation task.

## Common Pitfalls

**Missing permissions**: You need at least Contributor on the resource and Log Analytics Contributor on the workspace. If you are using Azure Policy, the managed identity needs these permissions too.

**Log categories not available**: Not every resource type supports every log category. Check the Azure documentation for your specific resource to see which categories exist.

**Data latency**: Platform logs are not real-time. Expect a delay of 2 to 15 minutes depending on the resource type and the volume of data.

**Duplicate data**: If you create multiple diagnostic settings on the same resource pointing to the same workspace with overlapping log categories, you will get duplicate records. Each diagnostic setting should have a unique set of categories or point to a different destination.

## Cost Considerations

Every GB of data ingested into a Log Analytics workspace costs money. Before enabling all log categories on every resource, think about what you actually need. For instance, `AppServiceHTTPLogs` on a high-traffic web app can generate a lot of data. Start with the categories that matter for your use case - security audits, error logs, performance metrics - and expand from there.

You can check your current ingestion volume with this KQL query.

```
// Check data volume per table over the past 24 hours
Usage
| where TimeGenerated > ago(24h)
| summarize DataGB = sum(Quantity) / 1024 by DataType
| order by DataGB desc
```

## Wrapping Up

Diagnostic settings are the foundation of observability on Azure. Without them, your resources generate logs that nobody can see. Setting them up is straightforward - pick the resource, choose the log categories, select a Log Analytics workspace as the destination, and save. For production environments, automate the process with Azure Policy so new resources automatically get diagnostic settings applied. Once the data is flowing, you can build KQL queries, dashboards, and alerts to keep your infrastructure healthy.
