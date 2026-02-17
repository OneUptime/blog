# How to Set Up Azure Log Analytics Data Collection Rules for Custom Log Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Log Analytics, Data Collection Rules, Custom Logs, Azure Monitor Agent, Log Ingestion, Cloud Monitoring

Description: Learn how to configure Data Collection Rules in Azure Log Analytics to ingest custom log files and other non-standard data sources using the Azure Monitor Agent.

---

The Azure Monitor Agent (AMA) replaced the legacy Log Analytics agent (MMA/OMS) as the standard way to collect data from virtual machines and on-premises servers. One of its biggest improvements is Data Collection Rules (DCRs) - a centralized, declarative way to define what data gets collected, how it gets transformed, and where it gets sent. If you have custom application logs, text files, or other non-standard data sources that need to flow into Log Analytics, DCRs are how you set that up.

This post walks through creating DCRs for custom log sources, configuring the Azure Monitor Agent to use them, and transforming the data at ingestion time using KQL.

## What Are Data Collection Rules?

A Data Collection Rule is an Azure resource that defines:

1. **Data sources** - What to collect (performance counters, Windows event logs, syslog, custom text logs, custom JSON logs).
2. **Transformations** - How to modify or filter the data using KQL before it reaches the destination.
3. **Destinations** - Where to send the data (one or more Log Analytics workspaces).

DCRs decouple the data collection configuration from the agent itself. You create a DCR, associate it with one or more virtual machines (through Data Collection Rule Associations), and the Azure Monitor Agent on those VMs automatically picks up the configuration.

## Prerequisites

Before setting up custom log collection, you need:

- One or more Azure VMs or Arc-enabled servers with the Azure Monitor Agent installed.
- A Log Analytics workspace.
- A custom log table in the workspace (we will create one).
- Contributor access to the resource group.

## Step 1: Create a Custom Log Table

Custom logs need a destination table. In Log Analytics, custom tables have a `_CL` suffix. You define the schema based on the columns your log data will have.

```bash
# Create a custom log table in your Log Analytics workspace
# The table schema must include a TimeGenerated column
az monitor log-analytics workspace table create \
  --resource-group rg-monitoring \
  --workspace-name law-central \
  --name MyAppLogs_CL \
  --columns TimeGenerated=datetime RawData=string Level=string Message=string Source=string
```

The `TimeGenerated` column is mandatory for all custom tables. The other columns depend on your log format.

## Step 2: Create a Data Collection Endpoint

For custom log ingestion, you need a Data Collection Endpoint (DCE). This is the endpoint that receives the data.

```bash
# Create a data collection endpoint
az monitor data-collection endpoint create \
  --name dce-custom-logs \
  --resource-group rg-monitoring \
  --location eastus \
  --public-network-access Enabled
```

## Step 3: Create the Data Collection Rule

Now create the DCR that defines the collection. Here is an ARM template for collecting a custom text log file.

```json
{
  "type": "Microsoft.Insights/dataCollectionRules",
  "apiVersion": "2022-06-01",
  "name": "dcr-custom-app-logs",
  "location": "eastus",
  "properties": {
    "dataCollectionEndpointId": "[resourceId('Microsoft.Insights/dataCollectionEndpoints', 'dce-custom-logs')]",
    "streamDeclarations": {
      "Custom-MyAppLogs_CL": {
        "columns": [
          { "name": "TimeGenerated", "type": "datetime" },
          { "name": "RawData", "type": "string" }
        ]
      }
    },
    "dataSources": {
      "logFiles": [
        {
          "streams": ["Custom-MyAppLogs_CL"],
          "filePatterns": ["/var/log/myapp/*.log"],
          "format": "text",
          "settings": {
            "text": {
              "recordStartTimestampFormat": "ISO 8601"
            }
          },
          "name": "myAppLogFiles"
        }
      ]
    },
    "destinations": {
      "logAnalytics": [
        {
          "workspaceResourceId": "[parameters('workspaceResourceId')]",
          "name": "lawDestination"
        }
      ]
    },
    "dataFlows": [
      {
        "streams": ["Custom-MyAppLogs_CL"],
        "destinations": ["lawDestination"],
        "transformKql": "source | extend Level = extract('\\[(\\w+)\\]', 1, RawData) | extend Message = extract('\\]\\s+(.*)', 1, RawData)",
        "outputStream": "Custom-MyAppLogs_CL"
      }
    ]
  }
}
```

There are several important pieces here:

- **streamDeclarations** defines the schema of the incoming data stream.
- **dataSources.logFiles** specifies which log files to collect, using file glob patterns.
- **dataFlows** connects sources to destinations and includes an optional KQL transformation.
- **transformKql** lets you parse, filter, and transform the data before it is stored.

## Step 4: Associate the DCR with VMs

After creating the DCR, associate it with the VMs that should use it.

```bash
# Get the DCR resource ID
DCR_ID=$(az monitor data-collection rule show \
  --name dcr-custom-app-logs \
  --resource-group rg-monitoring \
  --query id -o tsv)

# Associate the DCR with a virtual machine
az monitor data-collection rule association create \
  --name "vm-dcr-association" \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-prod/providers/Microsoft.Compute/virtualMachines/app-server-01" \
  --rule-id "$DCR_ID"
```

The Azure Monitor Agent on the VM will pick up the new DCR within a few minutes and begin collecting the specified log files.

## Using KQL Transformations

The `transformKql` field in the data flow is where DCRs get really powerful. Instead of ingesting raw log lines and parsing them at query time, you can parse them at ingestion time. This means:

- Faster queries because the data is already structured.
- Lower storage costs because you can drop unnecessary fields.
- Consistent schema enforcement.

Here is a transformation that parses a structured log line format like `2026-02-16 14:30:00 [ERROR] Connection timeout to database server`.

```
source
| extend TimeGenerated = todatetime(extract('^(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})', 1, RawData))
| extend Level = extract('\\[(\\w+)\\]', 1, RawData)
| extend Message = extract('\\]\\s+(.*)', 1, RawData)
| where Level != "DEBUG"
| project TimeGenerated, Level, Message
```

This transformation extracts the timestamp, log level, and message from each line, drops DEBUG-level entries (saving ingestion costs), and only stores the structured fields.

## Collecting Windows Event Logs

DCRs are not just for custom logs. Here is how to configure Windows Event Log collection.

```json
{
  "dataSources": {
    "windowsEventLogs": [
      {
        "streams": ["Microsoft-Event"],
        "xPathQueries": [
          "Application!*[System[(Level=1 or Level=2 or Level=3)]]",
          "Security!*[System[(band(Keywords,13510798882111488))]]",
          "System!*[System[(Level=1 or Level=2 or Level=3)]]"
        ],
        "name": "windowsEventLogs"
      }
    ]
  }
}
```

The XPath queries filter which events to collect. Level 1 is Critical, Level 2 is Error, Level 3 is Warning. This configuration collects all errors and warnings from Application and System logs, plus security audit events.

## Collecting Syslog from Linux

For Linux syslog collection.

```json
{
  "dataSources": {
    "syslog": [
      {
        "streams": ["Microsoft-Syslog"],
        "facilityNames": [
          "auth", "authpriv", "daemon", "kern", "syslog"
        ],
        "logLevels": ["Warning", "Error", "Critical", "Alert", "Emergency"],
        "name": "syslogDataSource"
      }
    ]
  }
}
```

This collects syslog entries from key facilities at Warning level and above. You can adjust the facility names and log levels based on your needs.

## Collecting Performance Counters

DCRs also handle performance counter collection, replacing the legacy agent's performance counter configuration.

```json
{
  "dataSources": {
    "performanceCounters": [
      {
        "streams": ["Microsoft-Perf"],
        "samplingFrequencyInSeconds": 60,
        "counterSpecifiers": [
          "\\Processor(_Total)\\% Processor Time",
          "\\Memory\\Available MBytes",
          "\\LogicalDisk(_Total)\\% Free Space",
          "\\LogicalDisk(_Total)\\Avg. Disk sec/Read"
        ],
        "name": "perfCounters"
      }
    ]
  }
}
```

## Managing DCRs at Scale

In a large environment with many VMs, you do not want to manually associate DCRs with each VM. Use Azure Policy to automatically associate DCRs with VMs based on tags, resource groups, or subscriptions.

Azure provides built-in policies like "Configure Linux machines to be associated with a data collection rule" and "Configure Windows machines to be associated with a data collection rule."

```bash
# Assign a policy that auto-associates a DCR with all VMs in a resource group
az policy assignment create \
  --name "auto-dcr-linux" \
  --policy "a4034bc6-4c15-4a55-ad73-0fcf62085200" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-prod" \
  --params "{\"dcrResourceId\": {\"value\": \"$DCR_ID\"}}" \
  --assign-identity \
  --location eastus
```

## Troubleshooting

**Logs not appearing**: Check that the Azure Monitor Agent is running on the VM. Check that the DCR association exists. Check the agent logs at `/var/opt/microsoft/azuremonitoragent/log/` on Linux or `C:\WindowsAzure\Logs\Plugins\Microsoft.Azure.Monitor.AzureMonitorWindowsAgent` on Windows.

**Transformation errors**: If your KQL transformation has a syntax error, the DCR creation will fail. Test your transformation query in the Log Analytics query editor first using sample data.

**Permission issues**: The managed identity of the Azure Monitor Agent needs the "Monitoring Metrics Publisher" role on the Data Collection Rule. This is usually configured automatically, but verify if data is not flowing.

**File pattern not matching**: Make sure the file pattern in your DCR matches the actual log file paths on the VM. Patterns are case-sensitive on Linux.

## Wrapping Up

Data Collection Rules are a significant improvement over the legacy agent configuration. They give you centralized management, ingestion-time transformations, and the ability to collect from multiple data sources in a single rule. Start by migrating your existing Windows Event Log and syslog collection from the legacy agent to DCRs, then add custom log file collection for your application-specific logs. The ingestion-time KQL transformations alone can save you significant money by parsing and filtering data before it is stored.
