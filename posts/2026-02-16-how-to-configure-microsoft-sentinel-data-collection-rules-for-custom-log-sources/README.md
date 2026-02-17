# How to Configure Microsoft Sentinel Data Collection Rules for Custom Log Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Microsoft Sentinel, Data Collection Rules, Log Analytics, Custom Logs, SIEM, Monitoring

Description: A detailed guide to creating Data Collection Rules in Microsoft Sentinel for ingesting custom log sources from on-premises servers and custom applications.

---

Microsoft Sentinel is only as good as the data you feed it. While the built-in data connectors handle common sources like Azure AD, Office 365, and Azure resources, many organizations have custom applications, legacy systems, or on-premises servers that generate logs in non-standard formats. Data Collection Rules (DCRs) are the mechanism for ingesting these custom log sources into Sentinel.

In this guide, I will cover how to create DCRs for custom text logs, syslog, and custom application logs using the Azure Monitor Agent.

## What Are Data Collection Rules?

Data Collection Rules replaced the legacy Log Analytics agent configuration. Instead of configuring data collection on each agent individually, DCRs are centralized definitions that specify:

- **What data to collect:** Which log files, performance counters, or syslog facilities
- **How to transform it:** KQL-based transformations to parse, filter, or enrich data before ingestion
- **Where to send it:** Which Log Analytics workspace (and therefore which Sentinel instance)

DCRs are Azure resources, which means they can be managed through ARM templates, Bicep, Terraform, or Azure CLI - fitting naturally into your infrastructure-as-code workflow.

## Prerequisites

- A Microsoft Sentinel workspace backed by a Log Analytics workspace
- Azure Monitor Agent (AMA) installed on the machines you want to collect from
- Contributor access to the resource group where you will create DCRs
- For custom text logs, the table must exist in the workspace before creating the DCR

## Understanding the Azure Monitor Agent

The Azure Monitor Agent (AMA) is the replacement for the legacy Log Analytics Agent (MMA/OMS) and the Telegraf agent. It runs on Windows and Linux, both in Azure VMs and on-premises servers registered through Azure Arc.

```bash
# Install Azure Monitor Agent on an Azure VM
az vm extension set \
  --name AzureMonitorLinuxAgent \
  --publisher Microsoft.Azure.Monitor \
  --vm-name myLinuxVM \
  --resource-group myResourceGroup

# For Windows VMs, use AzureMonitorWindowsAgent instead
az vm extension set \
  --name AzureMonitorWindowsAgent \
  --publisher Microsoft.Azure.Monitor \
  --vm-name myWindowsVM \
  --resource-group myResourceGroup

# For Azure Arc-connected on-premises servers
az connectedmachine extension create \
  --name AzureMonitorLinuxAgent \
  --publisher Microsoft.Azure.Monitor \
  --machine-name myOnPremServer \
  --resource-group myArcResourceGroup \
  --type AzureMonitorLinuxAgent
```

## Creating a Custom Table in Log Analytics

Before you can ingest custom logs, you need a destination table. Custom tables in Log Analytics use the `_CL` suffix convention.

```bash
# Create a custom table in the Log Analytics workspace
# Define the schema with the columns you expect from your log data
az monitor log-analytics workspace table create \
  --workspace-name mySentinelWorkspace \
  --resource-group myResourceGroup \
  --name "ApplicationLogs_CL" \
  --columns \
    TimeGenerated=datetime \
    RawData=string \
    Computer=string \
    LogLevel=string \
    Message=string \
    SourceModule=string
```

You can also create the table through the Log Analytics workspace in the portal under "Tables."

## DCR for Custom Text Logs

Let us create a DCR that collects a custom log file from a Linux server. Suppose your application writes logs to `/var/log/myapp/application.log` in a format like:

```
2026-02-16 10:23:45 ERROR PaymentModule - Failed to process payment: timeout
2026-02-16 10:23:47 INFO PaymentModule - Retrying payment processing
```

Here is the DCR definition in JSON:

```json
{
  // Data Collection Rule for custom application log files
  "location": "eastus",
  "properties": {
    "dataSources": {
      "logFiles": [
        {
          "streams": ["Custom-ApplicationLogs_CL"],
          "filePatterns": [
            // Glob pattern for the log file path
            "/var/log/myapp/application.log"
          ],
          "format": "text",
          "settings": {
            "text": {
              // Each line is a separate record
              "recordStartTimestampFormat": "ISO 8601"
            }
          },
          "name": "myAppLogSource"
        }
      ]
    },
    // KQL transformation to parse the raw log line into structured fields
    "dataFlows": [
      {
        "streams": ["Custom-ApplicationLogs_CL"],
        "destinations": ["logAnalyticsWorkspace"],
        "transformKql": "source | parse RawData with Timestamp:datetime ' ' LogLevel:string ' ' SourceModule:string ' - ' Message:string",
        "outputStream": "Custom-ApplicationLogs_CL"
      }
    ],
    "destinations": {
      "logAnalytics": [
        {
          "workspaceResourceId": "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/mySentinelWorkspace",
          "name": "logAnalyticsWorkspace"
        }
      ]
    }
  }
}
```

Create the DCR using Azure CLI:

```bash
# Create the Data Collection Rule from the JSON definition
az monitor data-collection rule create \
  --name "dcr-custom-app-logs" \
  --resource-group myResourceGroup \
  --location eastus \
  --rule-file @dcr-definition.json
```

## Associating the DCR with Machines

After creating the DCR, you need to associate it with the machines that should use it. This is done through Data Collection Rule Associations (DCRAs).

```bash
# Associate the DCR with a specific VM
# The VM must have Azure Monitor Agent installed
az monitor data-collection rule association create \
  --name "myvm-applog-association" \
  --rule-id "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Insights/dataCollectionRules/dcr-custom-app-logs" \
  --resource "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Compute/virtualMachines/myLinuxVM"

# Associate with an Azure Arc-connected server
az monitor data-collection rule association create \
  --name "arcserver-applog-association" \
  --rule-id "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Insights/dataCollectionRules/dcr-custom-app-logs" \
  --resource "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.HybridCompute/machines/myOnPremServer"
```

You can associate one DCR with many machines, and one machine can have multiple DCR associations. This makes it flexible to collect different log types from different server groups.

## DCR for Syslog Collection

Syslog is a common source for Linux servers and network devices. Here is a DCR that collects syslog messages:

```json
{
  // DCR for syslog collection from Linux servers
  "location": "eastus",
  "properties": {
    "dataSources": {
      "syslog": [
        {
          "streams": ["Microsoft-Syslog"],
          "facilityNames": [
            "auth",
            "authpriv",
            "daemon",
            "kern",
            "syslog",
            "local0",
            "local1"
          ],
          // Collect Warning level and above
          "logLevels": [
            "Warning",
            "Error",
            "Critical",
            "Alert",
            "Emergency"
          ],
          "name": "syslogDataSource"
        }
      ]
    },
    "dataFlows": [
      {
        "streams": ["Microsoft-Syslog"],
        "destinations": ["logAnalyticsWorkspace"]
      }
    ],
    "destinations": {
      "logAnalytics": [
        {
          "workspaceResourceId": "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/mySentinelWorkspace",
          "name": "logAnalyticsWorkspace"
        }
      ]
    }
  }
}
```

The facility and log level filtering happens at the agent level, so only the data you specify is collected and sent. This is important for cost control since Log Analytics charges by data volume.

## Using KQL Transformations in DCRs

One of the most powerful features of DCRs is the ability to transform data before it is stored. This lets you:

- Parse unstructured text into structured columns
- Filter out noisy log lines to reduce ingestion costs
- Enrich data with calculated fields
- Normalize fields across different log sources

Here is an example transformation that parses a custom log format and filters out DEBUG lines:

```
// KQL transformation in a DCR dataFlow
// Parse the raw log line and filter out debug messages
source
| parse RawData with Timestamp:datetime ' ' LogLevel:string ' [' ThreadId:string '] ' ClassName:string ' - ' Message:string
| where LogLevel != "DEBUG"
| extend TimeGenerated = Timestamp
| project TimeGenerated, LogLevel, ThreadId, ClassName, Message, Computer
```

This transformation runs in the pipeline before data reaches the workspace. Filtered-out records are not stored and not billed.

## DCR for Windows Event Logs

For Windows servers, you can collect specific event log channels:

```json
{
  // DCR for Windows security and application event logs
  "location": "eastus",
  "properties": {
    "dataSources": {
      "windowsEventLogs": [
        {
          "streams": ["Microsoft-SecurityEvent"],
          // XPath queries to filter specific events
          "xPathQueries": [
            "Security!*[System[(EventID=4624 or EventID=4625 or EventID=4648)]]",
            "Application!*[System[(Level=1 or Level=2 or Level=3)]]"
          ],
          "name": "windowsSecurityEvents"
        }
      ]
    },
    "dataFlows": [
      {
        "streams": ["Microsoft-SecurityEvent"],
        "destinations": ["logAnalyticsWorkspace"]
      }
    ],
    "destinations": {
      "logAnalytics": [
        {
          "workspaceResourceId": "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/mySentinelWorkspace",
          "name": "logAnalyticsWorkspace"
        }
      ]
    }
  }
}
```

The XPath queries let you collect only specific event IDs, which is critical for cost management. Collecting all Windows Security events generates enormous data volumes.

## Managing DCRs with Bicep

For production environments, manage your DCRs as code:

```bicep
// Bicep template for a Data Collection Rule
// Collects custom application logs and syslog

param workspaceId string
param location string = resourceGroup().location

resource dcr 'Microsoft.Insights/dataCollectionRules@2022-06-01' = {
  name: 'dcr-production-app-logs'
  location: location
  properties: {
    dataSources: {
      logFiles: [
        {
          streams: ['Custom-ApplicationLogs_CL']
          filePatterns: ['/var/log/myapp/*.log']
          format: 'text'
          settings: {
            text: {
              recordStartTimestampFormat: 'ISO 8601'
            }
          }
          name: 'appLogs'
        }
      ]
      syslog: [
        {
          streams: ['Microsoft-Syslog']
          facilityNames: ['auth', 'authpriv']
          logLevels: ['Warning', 'Error', 'Critical', 'Alert', 'Emergency']
          name: 'syslog'
        }
      ]
    }
    dataFlows: [
      {
        streams: ['Custom-ApplicationLogs_CL']
        destinations: ['workspace']
        // Parse and filter the application logs
        transformKql: 'source | where RawData !contains "HEARTBEAT" | extend TimeGenerated = now()'
        outputStream: 'Custom-ApplicationLogs_CL'
      }
      {
        streams: ['Microsoft-Syslog']
        destinations: ['workspace']
      }
    ]
    destinations: {
      logAnalytics: [
        {
          workspaceResourceId: workspaceId
          name: 'workspace'
        }
      ]
    }
  }
}
```

## Troubleshooting DCR Issues

When logs are not appearing in your workspace, check these things in order:

1. **Agent health:** Verify AMA is running on the target machine. Check the agent heartbeat table in Log Analytics.
2. **DCR association:** Confirm the DCR is associated with the machine. Use `az monitor data-collection rule association list`.
3. **File permissions:** The agent process must have read access to the log files. On Linux, check file permissions and SELinux contexts.
4. **Log file pattern:** Verify the file pattern in the DCR matches the actual file path. Glob patterns are case-sensitive on Linux.
5. **Transformation errors:** If the KQL transformation has a syntax error, records are dropped silently. Test your KQL in Log Analytics first.
6. **Table schema mismatch:** The output columns from your transformation must match the table schema.

```bash
# Check AMA agent status on a Linux VM
systemctl status azuremonitoragent

# Check AMA logs for errors
journalctl -u azuremonitoragent --since "1 hour ago" | tail -50

# Verify DCR associations for a VM
az monitor data-collection rule association list \
  --resource "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Compute/virtualMachines/myLinuxVM" \
  --output table
```

## Summary

Data Collection Rules are the foundation of custom log ingestion in Microsoft Sentinel. They give you a centralized, code-manageable way to define what data is collected, how it is transformed, and where it goes. Start with a simple text log DCR, verify data flows through, and then add transformations to parse and filter your logs. The key to keeping costs under control is using KQL transformations to drop noise before it reaches the workspace.
