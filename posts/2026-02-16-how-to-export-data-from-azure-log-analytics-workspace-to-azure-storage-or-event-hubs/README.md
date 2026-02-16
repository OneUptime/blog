# How to Export Data from Azure Log Analytics Workspace to Azure Storage or Event Hubs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Log Analytics, Data Export, Azure Storage, Event Hubs, Log Management, Data Archiving

Description: Step-by-step instructions for exporting data from an Azure Log Analytics workspace to Azure Storage or Event Hubs for archiving and external integration.

---

Log Analytics is great for interactive querying and alerting, but sometimes you need your data somewhere else. Maybe you need long-term archiving at lower cost, maybe you want to feed data into an external SIEM, or maybe a compliance requirement says you need an immutable copy of your logs in a separate storage account. The data export feature in Azure Log Analytics lets you continuously stream data from specific tables to Azure Storage accounts or Event Hubs.

This post covers how to set up data export rules, what tables are supported, how to manage costs, and the differences between data export and other data movement options.

## Data Export vs Other Options

Before setting up data export, make sure it is the right tool for the job. Azure has several ways to get data out of Log Analytics.

**Data Export Rules** (what this post covers): Continuous, near real-time export of data as it arrives in your workspace. Best for ongoing archiving or streaming to external systems.

**Diagnostic Settings**: Route platform logs directly to a storage account or Event Hub without going through Log Analytics at all. Best if you do not need the data in Log Analytics.

**Query API / Export API**: Run a KQL query and download the results. Best for one-time exports or scheduled reports.

**Azure Data Explorer Proxy**: Query Log Analytics data from Azure Data Explorer without moving it. Best for ad-hoc cross-platform analysis.

Data export rules are the right choice when you need a continuous, automated copy of your Log Analytics data flowing to another destination.

## Supported Tables

Not every table in Log Analytics supports data export. Most built-in tables from Azure Monitor are supported, including:

- SecurityEvent
- Syslog
- Heartbeat
- Perf
- ContainerLog
- AzureDiagnostics
- AzureMetrics
- AppRequests, AppDependencies, AppExceptions, AppTraces
- Most Microsoft Sentinel tables

Custom log tables (tables ending in `_CL`) are also supported. Check the Azure documentation for the full list, as it is updated regularly.

## Prerequisites

- A Log Analytics workspace on the pay-as-you-go or commitment tier. Data export is not available on the free tier.
- An Azure Storage account or Event Hubs namespace in the same region as the workspace.
- Contributor access on both the workspace and the destination resource.

## Step 1: Create the Destination

If exporting to Azure Storage, create a storage account.

```bash
# Create a storage account for log archiving
az storage account create \
  --name stlogarchive \
  --resource-group rg-monitoring \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2
```

If exporting to Event Hubs, create an Event Hubs namespace.

```bash
# Create an Event Hubs namespace for log streaming
az eventhubs namespace create \
  --name eh-log-export \
  --resource-group rg-monitoring \
  --location eastus \
  --sku Standard
```

You do not need to create individual containers or event hubs - the export rule creates them automatically based on the table names.

## Step 2: Create a Data Export Rule via the Portal

1. Navigate to your Log Analytics workspace in the Azure portal.
2. In the left menu, click **Data Export** (under **Settings**).
3. Click **New export rule**.
4. Fill in the details:
   - **Rule name**: A descriptive name like "archive-security-events".
   - **Destination type**: Storage Account or Event Hub.
   - **Destination**: Select the resource.
   - **Tables**: Select the tables you want to export.
5. Click **Create**.

## Step 3: Create a Data Export Rule via Azure CLI

```bash
# Create a data export rule to stream SecurityEvent and Syslog to a storage account
az monitor log-analytics workspace data-export create \
  --resource-group rg-monitoring \
  --workspace-name law-central \
  --name "archive-security-logs" \
  --tables SecurityEvent Syslog Heartbeat \
  --destination "/subscriptions/<sub-id>/resourceGroups/rg-monitoring/providers/Microsoft.Storage/storageAccounts/stlogarchive"
```

For Event Hubs:

```bash
# Create a data export rule to stream to Event Hubs
az monitor log-analytics workspace data-export create \
  --resource-group rg-monitoring \
  --workspace-name law-central \
  --name "stream-to-eventhub" \
  --tables SecurityEvent AppExceptions \
  --destination "/subscriptions/<sub-id>/resourceGroups/rg-monitoring/providers/Microsoft.EventHub/namespaces/eh-log-export"
```

## Step 4: Create with ARM Templates

For infrastructure-as-code deployments:

```json
{
  "type": "Microsoft.OperationalInsights/workspaces/dataExports",
  "apiVersion": "2020-08-01",
  "name": "[concat(parameters('workspaceName'), '/archive-all-logs')]",
  "properties": {
    "destination": {
      "resourceId": "[parameters('storageAccountResourceId')]"
    },
    "tableNames": [
      "SecurityEvent",
      "Syslog",
      "Heartbeat",
      "Perf",
      "AzureDiagnostics"
    ],
    "enable": true
  }
}
```

## How Exported Data Is Organized

### Storage Account

When data is exported to a storage account, it is organized in a container-per-table structure:

```
stlogarchive/
  am-securityevent/
    WorkspaceResourceId=/subscriptions/.../
      y=2026/
        m=02/
          d=16/
            h=14/
              m=30/
                PT05M.json
  am-syslog/
    WorkspaceResourceId=/subscriptions/.../
      y=2026/
        m=02/
          ...
```

Each file is a JSON blob containing the exported records in a newline-delimited JSON format. Files are created approximately every 5 minutes, depending on the data volume.

### Event Hubs

When data is exported to Event Hubs, each table gets its own event hub within the namespace. The event hub is named after the table (in lowercase). Each event contains one or more records in JSON format.

The data arrives in near real-time, typically within a few minutes of ingestion into Log Analytics.

## Querying Exported Data in Storage

Once data lands in Azure Storage, you can query it using Azure Data Explorer, Azure Synapse Analytics, or any tool that reads JSON from blob storage.

Here is how to query exported data from Azure Data Explorer:

```
// Create an external table pointing to the exported data in blob storage
.create external table SecurityEvents (
    TimeGenerated: datetime,
    Computer: string,
    EventID: int,
    Account: string,
    Activity: string
)
kind=blob
dataformat=multijson
(
    h@'https://stlogarchive.blob.core.windows.net/am-securityevent;managed_identity=system'
)
```

## Managing Export Costs

Data export itself is free - you do not pay for the export operation. However, you do pay for:

- **Storage costs**: The data stored in your storage account. Use Standard_LRS for the lowest cost. Configure lifecycle management policies to automatically move data to cool or archive tiers.
- **Event Hubs costs**: Throughput units and ingress charges for data flowing into Event Hubs.
- **Data volume**: The exported data is a copy, so your storage costs are proportional to your Log Analytics ingestion volume for the exported tables.

To manage costs, be selective about which tables you export. There is no point in archiving performance counters if you only need them for the last 30 days. Export the tables that have compliance or long-term analysis requirements.

### Setting Up Lifecycle Management

Configure lifecycle management on the storage account to move old data to cheaper tiers.

```bash
# Create a lifecycle management policy to move data to cool storage after 30 days
# and to archive after 90 days
az storage account management-policy create \
  --account-name stlogarchive \
  --resource-group rg-monitoring \
  --policy '{
    "rules": [
      {
        "name": "archiveOldLogs",
        "enabled": true,
        "type": "Lifecycle",
        "definition": {
          "filters": {
            "blobTypes": ["blockBlob"],
            "prefixMatch": ["am-"]
          },
          "actions": {
            "baseBlob": {
              "tierToCool": {
                "daysAfterModificationGreaterThan": 30
              },
              "tierToArchive": {
                "daysAfterModificationGreaterThan": 90
              },
              "delete": {
                "daysAfterModificationGreaterThan": 365
              }
            }
          }
        }
      }
    ]
  }'
```

## Monitoring Export Health

After creating an export rule, monitor its health to make sure data is flowing.

In the portal, go to the Data Export section of your workspace and check the status of each rule. You can also set up alerts for export failures.

```
// KQL query to check if exported tables are still receiving data
// Run this in your Log Analytics workspace
union SecurityEvent, Syslog
| where TimeGenerated > ago(1h)
| summarize LastRecord = max(TimeGenerated), RecordCount = count() by Type
```

If a table shows no recent records, the export might be failing or the source data has stopped flowing.

## Limitations

- **Table support**: Not all tables support data export. Check the documentation for your specific tables.
- **No filtering**: You cannot filter the exported data - everything in the selected tables gets exported. If you need filtered exports, consider using Logic Apps or Azure Functions with the query API instead.
- **Same region**: The destination storage account or Event Hub namespace must be in the same region as the workspace.
- **Export latency**: Data typically arrives at the destination within 5 to 20 minutes of ingestion. This is not suitable for real-time streaming with sub-second latency requirements.
- **Maximum rules**: You can create up to 10 data export rules per workspace.

## Wrapping Up

Data export rules provide a straightforward, continuous way to copy your Log Analytics data to Azure Storage or Event Hubs. Use storage for long-term archiving with lifecycle policies to manage costs, and Event Hubs for streaming to external systems like a SIEM or data lake. Be selective about which tables you export, monitor the export health, and set up storage lifecycle policies so you are not paying premium storage rates for data you rarely access.
