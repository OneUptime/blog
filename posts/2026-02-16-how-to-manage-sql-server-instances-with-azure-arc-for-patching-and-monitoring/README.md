# How to Manage SQL Server Instances with Azure Arc for Patching and Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Arc, SQL Server, Patching, Monitoring, Database Management, Hybrid Cloud

Description: Learn how to use Azure Arc to manage SQL Server instances running anywhere with centralized patching, monitoring, and security assessment capabilities.

---

SQL Server instances running on-premises or in other clouds are some of the hardest workloads to manage at scale. Each instance has its own patching schedule, its own monitoring setup, and its own security configuration. Azure Arc for SQL Server changes this by projecting those instances into Azure as managed resources, giving you a single management plane for patching, monitoring, security assessment, and inventory across all your SQL Server deployments.

In this guide, I will walk through setting up Azure Arc for SQL Server, configuring automated patching, enabling monitoring, and using the security assessment features.

## What Azure Arc for SQL Server Provides

When you connect a SQL Server instance to Azure Arc, you get several capabilities:

- **Centralized inventory** - See all your SQL Server instances in the Azure Portal
- **Best practices assessment** - Automated checks against Microsoft best practices
- **Azure Defender for SQL** - Advanced threat protection for on-premises SQL Server
- **Automated patching** - Schedule and deploy SQL Server patches from Azure
- **Performance monitoring** - Collect and visualize performance metrics in Azure Monitor
- **Pay-as-you-go licensing** - Option to use Azure billing for SQL Server licenses

## Prerequisites

To use Arc for SQL Server, you need:

1. SQL Server 2012 or later (Standard, Enterprise, or Developer edition)
2. The host server must be onboarded to Azure Arc as a connected machine
3. The Azure Connected Machine agent must be running and healthy
4. .NET Framework 4.7.2 or later on Windows hosts
5. The Arc server must have outbound connectivity to Azure

If you have not already onboarded your servers to Azure Arc, do that first. The SQL Server Arc extension builds on top of the base Arc agent.

## Step 1: Install the SQL Server Extension

The SQL Server extension is deployed as an Arc machine extension. You can install it manually or use Azure Policy for automatic deployment.

### Manual Installation

```bash
# Install the SQL Server extension on a Windows Arc server
az connectedmachine extension create \
    --machine-name "sql-server-01" \
    --resource-group "arc-servers-rg" \
    --name "WindowsAgent.SqlServer" \
    --publisher "Microsoft.AzureData" \
    --type "WindowsAgent.SqlServer" \
    --location "eastus" \
    --settings '{
        "SqlManagement": {
            "IsEnabled": true
        },
        "LicenseType": "PAYG"
    }'

# For Linux hosts running SQL Server
az connectedmachine extension create \
    --machine-name "sql-server-linux-01" \
    --resource-group "arc-servers-rg" \
    --name "LinuxAgent.SqlServer" \
    --publisher "Microsoft.AzureData" \
    --type "LinuxAgent.SqlServer" \
    --location "eastus"
```

### Automatic Deployment via Azure Policy

For at-scale deployment, use the built-in policy:

```bash
# Assign the policy to auto-deploy SQL Server extension
az policy assignment create \
    --name "deploy-sql-arc-ext" \
    --display-name "Deploy SQL Server Arc extension automatically" \
    --policy "fd2d1a6e-6d95-4f2e-a7ff-d6fee3f476ee" \
    --scope "/subscriptions/your-subscription-id" \
    --mi-system-assigned \
    --location "eastus" \
    --role "Contributor"
```

## Step 2: Verify SQL Server Discovery

After the extension is installed, it automatically discovers SQL Server instances running on the host. Each instance appears as a separate Azure resource.

```bash
# List all Arc-enabled SQL Server instances
az resource list \
    --resource-type "Microsoft.AzureArcData/sqlServerInstances" \
    --resource-group "arc-servers-rg" \
    --output table

# Get details about a specific instance
az resource show \
    --resource-type "Microsoft.AzureArcData/sqlServerInstances" \
    --name "sql-server-01_MSSQLSERVER" \
    --resource-group "arc-servers-rg"
```

In the Azure Portal, navigate to Azure Arc and then SQL Server instances. You will see all discovered instances with their version, edition, host name, and connection status.

## Step 3: Configure Best Practices Assessment

The best practices assessment (BPA) runs a comprehensive check against your SQL Server configuration and compares it to Microsoft's recommended settings. It covers performance, security, availability, and configuration areas.

```bash
# Enable best practices assessment
az sql server-arc extension set \
    --machine-name "sql-server-01" \
    --resource-group "arc-servers-rg" \
    --name "WindowsAgent.SqlServer" \
    --settings '{
        "AssessmentSettings": {
            "Enable": true,
            "RunImmediately": true,
            "Schedule": {
                "DayOfWeek": "Sunday",
                "Enable": true,
                "StartTime": "02:00",
                "WeeklyInterval": 1
            }
        }
    }'
```

The assessment results appear in the Azure Portal under the SQL Server instance resource. Each finding is categorized by severity and area, with detailed remediation guidance.

Here are some common findings the assessment catches:

- Max degree of parallelism not configured optimally
- TempDB files not distributed across multiple files
- Auto-shrink enabled (which is almost always bad for performance)
- Page verification not set to CHECKSUM
- Backup compression not enabled
- Missing indexes

## Step 4: Enable Azure Defender for SQL

Azure Defender (now Microsoft Defender for SQL) provides advanced threat protection for your on-premises SQL Server instances:

```bash
# Enable Defender for SQL on the Arc server
az security pricing create \
    --name "SqlServerVirtualMachines" \
    --tier "Standard"

# Verify Defender is active
az security pricing show \
    --name "SqlServerVirtualMachines"
```

Defender for SQL provides:

- **Vulnerability assessment** - Scans for database vulnerabilities and misconfigurations
- **Advanced threat protection** - Detects suspicious activities like SQL injection, brute force attacks, and anomalous access patterns
- **Compliance reporting** - Maps findings to compliance frameworks

## Step 5: Configure Monitoring

To get SQL Server performance metrics into Azure Monitor, you need to configure data collection.

### Setting Up Performance Monitoring

```bash
# Create a Log Analytics workspace if you don't have one
az monitor log-analytics workspace create \
    --workspace-name "sql-monitoring-ws" \
    --resource-group "monitoring-rg" \
    --location "eastus"

# Enable monitoring through the SQL Server extension settings
az connectedmachine extension update \
    --machine-name "sql-server-01" \
    --resource-group "arc-servers-rg" \
    --name "WindowsAgent.SqlServer" \
    --settings '{
        "SqlManagement": {
            "IsEnabled": true
        },
        "Monitoring": {
            "Enabled": true
        }
    }'
```

### Key Metrics to Monitor

Once monitoring is enabled, these metrics are available in Azure Monitor:

- CPU utilization by SQL Server process
- Memory usage (buffer pool, plan cache)
- Batch requests per second
- SQL compilations and recompilations per second
- Page life expectancy
- Disk I/O latency
- Wait statistics
- Active sessions and blocked processes

You can create alerts on any of these metrics:

```bash
# Create an alert for high CPU usage on SQL Server
az monitor metrics alert create \
    --name "sql-high-cpu" \
    --resource-group "monitoring-rg" \
    --scopes "/subscriptions/sub-id/resourceGroups/arc-servers-rg/providers/Microsoft.HybridCompute/machines/sql-server-01" \
    --condition "avg Processor(_Total)\\% Processor Time > 90" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --action "/subscriptions/sub-id/resourceGroups/monitoring-rg/providers/microsoft.insights/actionGroups/sql-alerts"
```

## Step 6: Configure Automated Patching

Automated patching lets you schedule SQL Server updates from Azure, eliminating the need to manage patching manually on each server.

```bash
# Configure automated patching schedule
az connectedmachine extension update \
    --machine-name "sql-server-01" \
    --resource-group "arc-servers-rg" \
    --name "WindowsAgent.SqlServer" \
    --settings '{
        "SqlManagement": {
            "IsEnabled": true
        },
        "PatchingSettings": {
            "Enable": true,
            "DayOfWeek": "Saturday",
            "MaintenanceWindowStartingHour": 2,
            "MaintenanceWindowDuration": 120
        }
    }'
```

The patching configuration specifies:
- Which day of the week to apply patches
- What time to start the maintenance window
- How long the maintenance window lasts (in minutes)

Patches are applied within the maintenance window, and the server is rebooted if necessary (only within the window).

## Viewing Everything in the Portal

The Azure Portal provides a rich experience for Arc-enabled SQL Server. On the SQL Server instance page, you can find:

- **Overview** - Version, edition, host, status
- **Best practices assessment** - Latest assessment results and trends
- **Defender for SQL** - Security findings and recommendations
- **Monitoring** - Performance dashboards and metrics
- **Databases** - List of databases on the instance
- **Backups** - Backup status and history

This centralized view is the real value proposition. Instead of RDP-ing into each server and opening SSMS, you can see the health and status of all your SQL Server instances from a single browser tab.

## Inventory and Reporting

For reporting purposes, you can query all your SQL Server instances using Azure Resource Graph:

```kusto
// Find all Arc-enabled SQL Server instances with their versions
resources
| where type == "microsoft.azurearcdata/sqlserverinstances"
| extend version = properties.version
| extend edition = properties.edition
| extend status = properties.status
| extend hostName = properties.containerResourceId
| project name, version, edition, status, hostName, location
| sort by version asc
```

This query gives you a complete inventory of every SQL Server instance managed through Arc, which is invaluable for license compliance and upgrade planning.

## Best Practices

**Onboard all SQL Server instances, not just production.** Having a complete inventory is more valuable than a partial one. Include development and staging instances too.

**Run BPA weekly.** Schedule the best practices assessment to run every week so you catch configuration drift early.

**Set up alerts for critical metrics.** At minimum, alert on high CPU, low page life expectancy, and blocked processes.

**Use maintenance windows wisely.** Schedule patching during low-usage periods and make sure the window is long enough for patches to complete.

**Review Defender findings regularly.** The vulnerability assessment findings should be reviewed and remediated as part of your regular security hygiene.

## Summary

Azure Arc for SQL Server provides a unified management experience for SQL Server instances running anywhere. By combining automated discovery, best practices assessment, security monitoring, performance tracking, and automated patching, you can manage your entire SQL Server estate from the Azure Portal. The setup process is straightforward - install the extension, configure the features you need, and start managing from Azure.
