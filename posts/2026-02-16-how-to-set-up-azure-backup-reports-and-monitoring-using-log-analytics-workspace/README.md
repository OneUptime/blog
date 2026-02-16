# How to Set Up Azure Backup Reports and Monitoring Using Log Analytics Workspace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Backup, Log Analytics, Monitoring, Backup Reports, Azure Monitor, Alerts, Data Protection

Description: Learn how to configure Azure Backup reports and monitoring using Log Analytics workspace to track backup health, job status, and storage consumption across all your vaults.

---

Azure Backup protects your VMs, databases, file shares, and other workloads. But having backups is only half the story - you also need to know that those backups are actually succeeding, that retention policies are being followed, and that storage consumption is under control. Azure Backup integrates with Log Analytics to give you centralized reporting and alerting across all your Recovery Services vaults. This guide shows how to set it up and build useful reports and alerts.

## Why Centralized Backup Monitoring

In a typical enterprise environment, you might have multiple Recovery Services vaults across different regions and subscriptions. Each vault has its own backup jobs, policies, and storage. Without centralized monitoring, you need to check each vault individually, which does not scale.

By routing backup diagnostic data to a Log Analytics workspace, you get:
- A single pane of glass for all backup activity
- The ability to query backup data using Kusto Query Language (KQL)
- Built-in Backup Reports through Azure workbooks
- Alert rules that trigger when backups fail
- Historical trend analysis for capacity planning

## Prerequisites

- One or more Recovery Services vaults with active backup jobs
- A Log Analytics workspace
- Azure CLI installed
- Contributor permissions on the Recovery Services vaults and the Log Analytics workspace

## Step 1: Create the Log Analytics Workspace

If you do not already have a workspace:

```bash
# Create a centralized Log Analytics workspace for backup monitoring
RESOURCE_GROUP="rg-backup-monitoring"
WORKSPACE_NAME="law-backup-central"
LOCATION="eastus"

az group create --name $RESOURCE_GROUP --location $LOCATION

az monitor log-analytics workspace create \
    --workspace-name $WORKSPACE_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --retention-time 180
```

I recommend using a dedicated workspace (or at least a shared monitoring workspace) rather than a workspace per vault. Centralization is the whole point.

## Step 2: Configure Diagnostic Settings on Each Vault

Each Recovery Services vault needs a diagnostic setting that sends backup data to the workspace:

```bash
# Get the vault resource ID
VAULT_NAME="rsv-production-eastus"
VAULT_RG="rg-production"

VAULT_ID=$(az backup vault show \
    --name $VAULT_NAME \
    --resource-group $VAULT_RG \
    --query id -o tsv)

# Get the workspace resource ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
    --workspace-name $WORKSPACE_NAME \
    --resource-group $RESOURCE_GROUP \
    --query id -o tsv)

# Create the diagnostic setting
# Use Resource specific mode for better query performance
az monitor diagnostic-settings create \
    --name backup-diagnostics \
    --resource "$VAULT_ID" \
    --workspace "$WORKSPACE_ID" \
    --logs '[
        {"category": "CoreAzureBackup", "enabled": true},
        {"category": "AddonAzureBackupJobs", "enabled": true},
        {"category": "AddonAzureBackupAlerts", "enabled": true},
        {"category": "AddonAzureBackupPolicy", "enabled": true},
        {"category": "AddonAzureBackupStorage", "enabled": true},
        {"category": "AddonAzureBackupProtectedInstance", "enabled": true}
    ]'
```

If you have multiple vaults, repeat this for each one. Here is a script to automate it across all vaults in a subscription:

```bash
#!/bin/bash
# configure-all-vaults.sh
# Apply diagnostic settings to all Recovery Services vaults in the subscription

WORKSPACE_ID=$(az monitor log-analytics workspace show \
    --workspace-name law-backup-central \
    --resource-group rg-backup-monitoring \
    --query id -o tsv)

# Get all Recovery Services vaults
VAULTS=$(az resource list \
    --resource-type "Microsoft.RecoveryServices/vaults" \
    --query "[].id" -o tsv)

for VAULT_ID in $VAULTS; do
    VAULT_NAME=$(echo "$VAULT_ID" | awk -F'/' '{print $NF}')
    echo "Configuring diagnostics for: $VAULT_NAME"

    az monitor diagnostic-settings create \
        --name backup-diagnostics \
        --resource "$VAULT_ID" \
        --workspace "$WORKSPACE_ID" \
        --logs '[
            {"category": "CoreAzureBackup", "enabled": true},
            {"category": "AddonAzureBackupJobs", "enabled": true},
            {"category": "AddonAzureBackupAlerts", "enabled": true},
            {"category": "AddonAzureBackupPolicy", "enabled": true},
            {"category": "AddonAzureBackupStorage", "enabled": true},
            {"category": "AddonAzureBackupProtectedInstance", "enabled": true}
        ]' 2>/dev/null

    echo "Done: $VAULT_NAME"
done
```

## Step 3: Access Azure Backup Reports

Azure Backup Reports is a built-in workbook that visualizes the diagnostic data. To access it:

1. Go to any Recovery Services vault in the Azure portal
2. Click on **Backup Reports** in the left menu
3. Select your Log Analytics workspace
4. Choose the time range

The reports include:
- **Summary**: Overall backup health across all vaults
- **Backup Items**: Status of each protected item
- **Usage**: Storage consumption trends
- **Jobs**: Backup and restore job history
- **Policy**: Backup policy adherence
- **Optimize**: Recommendations for cost optimization

## Step 4: Write Custom Queries

The built-in reports are good for standard monitoring, but custom queries let you answer specific questions.

### Find All Failed Backup Jobs in the Last 24 Hours

```kusto
// All failed backup jobs across all vaults
AddonAzureBackupJobs
| where TimeGenerated > ago(24h)
| where JobStatus == "Failed"
| project TimeGenerated, BackupItemUniqueId, JobOperation,
    JobFailureCode, VaultName = split(ResourceId, "/")[-1]
| join kind=inner (
    CoreAzureBackup
    | where TimeGenerated > ago(24h)
    | distinct BackupItemUniqueId, BackupItemFriendlyName,
        BackupItemType
) on BackupItemUniqueId
| project TimeGenerated, BackupItemFriendlyName, BackupItemType,
    JobOperation, JobFailureCode, VaultName
| order by TimeGenerated desc
```

### Check Which Items Have Not Been Backed Up Recently

```kusto
// Find protected items with no successful backup in the last 48 hours
// These are your most urgent attention items
CoreAzureBackup
| where TimeGenerated > ago(7d)
| where OperationName == "BackupItem"
| summarize arg_max(TimeGenerated, *) by BackupItemUniqueId
| where BackupItemProtectionState == "Protected"
| join kind=leftanti (
    AddonAzureBackupJobs
    | where TimeGenerated > ago(48h)
    | where JobOperation == "Backup"
    | where JobStatus == "Completed"
    | distinct BackupItemUniqueId
) on BackupItemUniqueId
| project BackupItemFriendlyName, BackupItemType,
    LastSeen = TimeGenerated,
    VaultName = split(ResourceId, "/")[-1]
| order by LastSeen asc
```

### Storage Consumption Trend

```kusto
// Storage usage trend over the last 30 days
AddonAzureBackupStorage
| where TimeGenerated > ago(30d)
| where StorageUniqueId != ""
| summarize
    StorageGB = max(StorageConsumedInMBs) / 1024.0
    by bin(TimeGenerated, 1d), VaultName = split(ResourceId, "/")[-1]
| order by TimeGenerated asc
| render timechart
```

### Backup Job Duration Trends

```kusto
// Track how long backup jobs are taking
// Increasing duration might indicate growing data or performance issues
AddonAzureBackupJobs
| where TimeGenerated > ago(30d)
| where JobOperation == "Backup"
| where JobStatus == "Completed"
| extend DurationMinutes = datetime_diff('minute', JobEndDateTime, JobStartDateTime)
| summarize
    AvgDuration = avg(DurationMinutes),
    MaxDuration = max(DurationMinutes),
    P95Duration = percentile(DurationMinutes, 95)
    by bin(TimeGenerated, 1d)
| order by TimeGenerated asc
| render timechart
```

## Step 5: Set Up Alerts

Proactive alerting is more valuable than reactive report checking. Set up alerts for the scenarios that matter most.

### Alert on Backup Failures

```bash
# Create a log-based alert for backup job failures
az monitor scheduled-query create \
    --name "BackupJobFailure" \
    --resource-group $RESOURCE_GROUP \
    --scopes "$WORKSPACE_ID" \
    --condition "count > 0" \
    --condition-query "AddonAzureBackupJobs | where TimeGenerated > ago(1h) | where JobStatus == 'Failed'" \
    --evaluation-frequency 1h \
    --window-size 1h \
    --severity 2 \
    --action-groups "/subscriptions/<sub-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Insights/actionGroups/backup-ops-team"
```

### Alert on Missing Backups

```bash
# Alert when a protected item has not been backed up in 48 hours
# This catches silent failures where the job never ran
az monitor scheduled-query create \
    --name "MissingBackup48h" \
    --resource-group $RESOURCE_GROUP \
    --scopes "$WORKSPACE_ID" \
    --condition "count > 0" \
    --condition-query "CoreAzureBackup | where TimeGenerated > ago(7d) | where OperationName == 'BackupItem' | where BackupItemProtectionState == 'Protected' | summarize arg_max(TimeGenerated, *) by BackupItemUniqueId | join kind=leftanti (AddonAzureBackupJobs | where TimeGenerated > ago(48h) | where JobOperation == 'Backup' | where JobStatus == 'Completed' | distinct BackupItemUniqueId) on BackupItemUniqueId" \
    --evaluation-frequency 6h \
    --window-size 6h \
    --severity 1 \
    --action-groups "/subscriptions/<sub-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Insights/actionGroups/backup-ops-team"
```

## Step 6: Build a Custom Dashboard

For a quick overview, create an Azure Dashboard that shows key backup metrics:

```bash
# Create a dashboard with key backup widgets
# You can do this through the Azure portal:
# 1. Create a new Dashboard
# 2. Add "Log Analytics query" tiles with the following queries:

# Tile 1: Failed Jobs Today
# AddonAzureBackupJobs | where TimeGenerated > ago(24h) | where JobStatus == "Failed" | count

# Tile 2: Protected Items Count
# CoreAzureBackup | where OperationName == "BackupItem" | where BackupItemProtectionState == "Protected" | summarize arg_max(TimeGenerated, *) by BackupItemUniqueId | count

# Tile 3: Storage Used (GB)
# AddonAzureBackupStorage | summarize max(StorageConsumedInMBs) / 1024.0 by split(ResourceId, "/")[-1]

# Tile 4: Backup Success Rate (Last 7 Days)
# AddonAzureBackupJobs | where TimeGenerated > ago(7d) | where JobOperation == "Backup" | summarize Success = countif(JobStatus == "Completed"), Total = count() | extend Rate = round(todouble(Success) / todouble(Total) * 100, 1)
```

## Data Retention Considerations

Backup diagnostic data in Log Analytics follows your workspace retention settings. For compliance and audit purposes, consider setting retention to at least 180 days. This lets you answer questions like "was this VM backed up 3 months ago?" which comes up during audits and incident reviews.

For longer retention needs, configure data export to a storage account:

```bash
# Export backup data to a storage account for long-term retention
az monitor log-analytics workspace data-export create \
    --workspace-name $WORKSPACE_NAME \
    --resource-group $RESOURCE_GROUP \
    --name backup-long-term \
    --destination "/subscriptions/<sub-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/backuparchive01" \
    --table-names AddonAzureBackupJobs CoreAzureBackup
```

## Summary

Azure Backup monitoring through Log Analytics gives you centralized visibility into backup health across all your Recovery Services vaults. Configure diagnostic settings on each vault, use the built-in Backup Reports for standard monitoring, write custom KQL queries for specific insights, and set up alerts for failures and missing backups. The initial setup takes about 30 minutes, and it saves you from the unpleasant surprise of discovering that a critical backup has been failing silently for weeks.
