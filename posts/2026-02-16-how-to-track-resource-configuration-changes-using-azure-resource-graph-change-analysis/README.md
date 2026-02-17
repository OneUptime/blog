# How to Track Resource Configuration Changes Using Azure Resource Graph Change Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Resource Graph, Change Analysis, Configuration Tracking, Governance, Troubleshooting, Auditing

Description: Learn how to use Azure Resource Graph Change Analysis to track resource configuration changes over time for troubleshooting and compliance auditing.

---

When something breaks in your Azure environment, the first question is usually "what changed?" Traditional approaches involve digging through Activity Logs, which tell you who did what but not exactly what properties changed and what the values were before and after. Azure Resource Graph Change Analysis fills this gap by maintaining a history of resource configuration changes and letting you query them with KQL.

In this post, I will show you how to use Change Analysis to track configuration changes, troubleshoot issues, and build compliance auditing workflows.

## What Change Analysis Captures

Change Analysis tracks changes to Azure resource properties as represented in Azure Resource Manager. When a resource property changes - whether through the portal, CLI, ARM template, or API - Change Analysis records the before and after values along with a timestamp.

This includes changes to:
- Resource properties (VM sizes, storage tiers, configuration settings)
- Tags
- Managed identity assignments
- Network configurations
- SKU changes
- Extension configurations

Change Analysis stores up to 14 days of change history by default. This is maintained in the Resource Graph change history tables, which you can query alongside the main resource tables.

## Enabling Change Analysis

For most resources, Change Analysis works automatically through Azure Resource Graph. However, for in-guest changes (changes inside the operating system, like web app file modifications), you need to enable the Application Change Analysis feature separately.

For the Resource Graph-based change tracking, no explicit enablement is needed. It works out of the box for all ARM resources.

For web app in-guest change tracking:

```bash
# Enable the Application Change Analysis provider
az provider register --namespace Microsoft.ChangeAnalysis

# Enable in-guest change tracking for a web app
az webapp config appsettings set \
    --resource-group "myapp-rg" \
    --name "my-webapp" \
    --settings "CHANGE_ANALYSIS_ENABLED=true"
```

## Querying Changes with Resource Graph

The change history is available through the `resourcechanges` table in Resource Graph. Here are the essential queries.

### View All Recent Changes

```kusto
// Show all resource changes in the last 24 hours
resourcechanges
| extend changeTime = todatetime(properties.changeAttributes.timestamp)
| extend changeType = tostring(properties.changeType)
| extend targetResourceType = tostring(properties.targetResourceType)
| extend targetResourceId = tostring(properties.targetResourceId)
| where changeTime > ago(24h)
| project changeTime, changeType, targetResourceType, targetResourceId
| sort by changeTime desc
| take 100
```

### View Changes for a Specific Resource

```kusto
// Track changes to a specific virtual machine
resourcechanges
| extend changeTime = todatetime(properties.changeAttributes.timestamp)
| extend targetResourceId = tostring(properties.targetResourceId)
| where targetResourceId contains "my-critical-vm"
| extend changes = properties.changes
| project changeTime, changes
| sort by changeTime desc
```

### Find Who Made a Change

```kusto
// Find who made changes and from what client
resourcechanges
| extend changeTime = todatetime(properties.changeAttributes.timestamp)
| extend changedBy = tostring(properties.changeAttributes.changedBy)
| extend changedByType = tostring(properties.changeAttributes.changedByType)
| extend clientType = tostring(properties.changeAttributes.clientType)
| extend targetResourceId = tostring(properties.targetResourceId)
| where changeTime > ago(7d)
| project changeTime, changedBy, changedByType, clientType, targetResourceId
| sort by changeTime desc
```

The `changedByType` field tells you whether the change was made by a user, service principal, or system process. The `clientType` tells you the tool used (Azure Portal, CLI, PowerShell, etc.).

## Practical Troubleshooting Scenarios

### Scenario 1: VM Performance Degraded

A VM suddenly started performing poorly. Let us check if its configuration changed:

```kusto
// Check for VM configuration changes in the last 3 days
resourcechanges
| extend changeTime = todatetime(properties.changeAttributes.timestamp)
| extend targetResourceId = tostring(properties.targetResourceId)
| extend targetResourceType = tostring(properties.targetResourceType)
| where targetResourceType == "microsoft.compute/virtualmachines"
| where changeTime > ago(3d)
| mv-expand changes = properties.changes
| extend propertyName = tostring(bag_keys(changes)[0])
| extend previousValue = tostring(changes[propertyName].previousValue)
| extend newValue = tostring(changes[propertyName].newValue)
| project changeTime, targetResourceId, propertyName, previousValue, newValue
| sort by changeTime desc
```

This might reveal that someone downsized the VM or changed a diagnostic setting.

### Scenario 2: Network Connectivity Lost

An application lost connectivity. Check for NSG rule changes:

```kusto
// Check for NSG changes in the last 48 hours
resourcechanges
| extend changeTime = todatetime(properties.changeAttributes.timestamp)
| extend targetResourceType = tostring(properties.targetResourceType)
| extend targetResourceId = tostring(properties.targetResourceId)
| extend changedBy = tostring(properties.changeAttributes.changedBy)
| where targetResourceType == "microsoft.network/networksecuritygroups"
| where changeTime > ago(48h)
| mv-expand changes = properties.changes
| extend propertyName = tostring(bag_keys(changes)[0])
| project changeTime, targetResourceId, propertyName, changedBy
| sort by changeTime desc
```

### Scenario 3: Unexpected Cost Increase

Costs spiked this week. Find resource SKU changes:

```kusto
// Find SKU changes across all resources in the last 7 days
resourcechanges
| extend changeTime = todatetime(properties.changeAttributes.timestamp)
| extend targetResourceId = tostring(properties.targetResourceId)
| where changeTime > ago(7d)
| mv-expand changes = properties.changes
| extend propertyName = tostring(bag_keys(changes)[0])
| where propertyName contains "sku" or propertyName contains "tier" or propertyName contains "size"
| extend previousValue = tostring(changes[propertyName].previousValue)
| extend newValue = tostring(changes[propertyName].newValue)
| project changeTime, targetResourceId, propertyName, previousValue, newValue
| sort by changeTime desc
```

## Building a Change Audit Report

For compliance purposes, you may need a regular report of all changes. Here is how to build one:

```kusto
// Weekly change audit report
resourcechanges
| extend changeTime = todatetime(properties.changeAttributes.timestamp)
| extend changeType = tostring(properties.changeType)
| extend changedBy = tostring(properties.changeAttributes.changedBy)
| extend clientType = tostring(properties.changeAttributes.clientType)
| extend targetResourceType = tostring(properties.targetResourceType)
| extend targetResourceId = tostring(properties.targetResourceId)
| where changeTime > ago(7d)
| summarize
    TotalChanges = count(),
    Creates = countif(changeType == "Create"),
    Updates = countif(changeType == "Update"),
    Deletes = countif(changeType == "Delete")
    by changedBy
| sort by TotalChanges desc
```

This gives you a per-user summary of all changes in the last week.

### Change Frequency by Resource Type

```kusto
// Which resource types change most frequently?
resourcechanges
| extend changeTime = todatetime(properties.changeAttributes.timestamp)
| extend targetResourceType = tostring(properties.targetResourceType)
| where changeTime > ago(7d)
| summarize ChangeCount = count() by targetResourceType
| sort by ChangeCount desc
| take 20
```

## Using Change Analysis in the Azure Portal

In addition to KQL queries, Change Analysis is available through the portal UI. Navigate to any resource, and in the "Diagnose and solve problems" blade, you will find a "Change Analysis" tab that shows a timeline of changes to that resource.

For web apps specifically, the Change Analysis blade shows both ARM-level changes and in-guest changes (file modifications, configuration changes, dependency changes).

## Automating Change Detection Alerts

You can combine Resource Graph queries with Azure Automation to create alerts for specific types of changes:

```powershell
# PowerShell runbook to detect and alert on sensitive changes
$sensitiveChanges = Search-AzGraph -Query @"
resourcechanges
| extend changeTime = todatetime(properties.changeAttributes.timestamp)
| extend targetResourceType = tostring(properties.targetResourceType)
| extend changedBy = tostring(properties.changeAttributes.changedBy)
| where changeTime > ago(1h)
| where targetResourceType in (
    'microsoft.network/networksecuritygroups',
    'microsoft.keyvault/vaults',
    'microsoft.authorization/roleassignments'
)
| project changeTime, targetResourceType, changedBy, properties.targetResourceId
"@

if ($sensitiveChanges.Count -gt 0) {
    # Send alert via email, Teams, or PagerDuty
    foreach ($change in $sensitiveChanges) {
        $message = "Sensitive resource change detected: $($change.targetResourceType) modified by $($change.changedBy)"
        Write-Output $message
        # Add your notification logic here
    }
}
```

## Comparing Change Analysis with Activity Log

You might wonder how Change Analysis differs from the Activity Log. Here is the key difference:

**Activity Log** tells you that an operation was performed (e.g., "VM was updated") and who performed it, but it does not tell you exactly which properties changed or what the previous values were.

**Change Analysis** tells you exactly which properties changed, what the old value was, and what the new value is. It provides the before-and-after snapshot.

For complete visibility, use both. Activity Log for the full audit trail of who did what, and Change Analysis for the technical details of what actually changed.

## Limitations

- Change history is retained for 14 days
- Some resource types may have limited change tracking support
- In-guest changes require the Application Change Analysis provider
- Very high-frequency changes (like auto-scaling events) may be batched
- The change data is eventually consistent, so there may be a short delay

## Best Practices

**Use Change Analysis as your first troubleshooting step.** When something breaks, query the change history before diving into logs. Most incidents are caused by configuration changes.

**Set up automated alerts for sensitive resources.** NSGs, Key Vaults, and RBAC assignments should trigger alerts when modified.

**Export change data for long-term retention.** Since Change Analysis only keeps 14 days of history, export the data to a Log Analytics workspace if you need longer retention for compliance.

**Correlate changes with incidents.** When you resolve an incident, document which change caused it. This builds institutional knowledge and helps prevent similar incidents.

## Summary

Azure Resource Graph Change Analysis gives you the ability to track exactly what changed in your Azure environment, when it changed, and who changed it. This is invaluable for troubleshooting, compliance auditing, and understanding the evolution of your infrastructure over time. By combining Change Analysis queries with automated alerts and regular reporting, you can maintain tight control over configuration changes across your entire Azure estate.
