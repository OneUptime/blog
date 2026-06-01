# How to Manage SQL Server Instances with Azure Arc for Patching and Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Arc, SQL Server, Patching, Monitoring, Database Management, Hybrid Cloud

Description: Learn how to use Azure Arc to manage SQL Server instances running anywhere with centralized patching, monitoring, and security assessment capabilities.

---

SQL Server instances running on-premises or in other clouds are some of the hardest workloads to manage at scale. Each instance has its own update schedule, its own monitoring setup, and its own security configuration. Azure Arc for SQL Server changes this by projecting those instances into Azure as managed resources, giving you a single management plane for updates, monitoring, security assessment, and inventory across all your SQL Server deployments.

In this guide, I will walk through setting up Azure Arc for SQL Server, configuring automated patching, enabling monitoring, and using the security assessment features.

## What Azure Arc for SQL Server Provides

When you connect a SQL Server instance to Azure Arc, you get several capabilities:

- **Centralized inventory** - See all your SQL Server instances in the Azure Portal
- **Best practices assessment** - Automated checks against Microsoft best practices
- **Microsoft Defender for SQL Servers on Machines** - Advanced threat protection for supported SQL Server instances on Windows machines
- **Automatic updates** - Configure Windows Update and Microsoft Update maintenance windows for supported Windows hosts
- **Performance monitoring** - Collect and visualize performance metrics in the Azure portal performance dashboard
- **Pay-as-you-go licensing** - Option to use Azure billing for SQL Server licenses

## Prerequisites

To use Arc for SQL Server, you need:

1. SQL Server 2012 or later, 64-bit only
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
# Look up the current built-in policy definition for deploying the SQL Server extension
POLICY_ID=$(az policy definition list \
    --query "[?displayName=='Configure Arc-enabled machines running SQL Server to have SQL Server extension installed'].id | [0]" \
    --output tsv)

# Assign the policy to auto-deploy the SQL Server extension
az policy assignment create \
    --name "deploy-sql-arc-ext" \
    --display-name "Deploy SQL Server Arc extension automatically" \
    --policy "$POLICY_ID" \
    --scope "/subscriptions/your-subscription-id" \
    --mi-system-assigned \
    --identity-scope "/subscriptions/your-subscription-id" \
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
# Create a Log Analytics workspace if you don't have one
az monitor log-analytics workspace create \
    --workspace-name "sql-assessment-ws" \
    --resource-group "monitoring-rg" \
    --location "eastus"
```

Then open the SQL Server instance resource in the Azure Portal, select Best practices assessment, choose the Log Analytics workspace, and select Enable assessment. By default, the assessment is scheduled to run every Sunday at 12:00 AM local time. The assessment results appear in the Azure Portal under the SQL Server instance resource. Each finding is categorized by severity and area, with detailed remediation guidance.

Here are some common findings the assessment catches:

- Max degree of parallelism not configured optimally
- TempDB files not distributed across multiple files
- Auto-shrink enabled (which is almost always bad for performance)
- Page verification not set to CHECKSUM
- Backup compression not enabled
- Missing indexes

## Step 4: Enable Microsoft Defender for SQL

Microsoft Defender for SQL Servers on Machines provides advanced threat protection for supported SQL Server instances on Windows machines:

```bash
# Enable Defender for SQL Servers on Machines at the subscription level
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

To get SQL Server performance metrics into the Azure portal performance dashboard, make sure your instances meet the monitoring prerequisites. Monitoring is a preview feature, requires Windows, SQL Server 2016 SP1 or later, Standard or Enterprise edition, Azure Extension for SQL Server version 1.1.2504.99 or later, and a Software Assurance or pay-as-you-go license type.

### Setting Up Performance Monitoring

```bash
# Enable performance metric collection on the SQL Server instance resource
az resource update \
    --ids "/subscriptions/sub-id/resourceGroups/arc-servers-rg/providers/Microsoft.AzureArcData/SqlServerInstances/sql-server-01_MSSQLSERVER" \
    --set "properties.monitoring.enabled=true" \
    --api-version "2023-09-01-preview"
```

### Key Metrics to Monitor

Once monitoring is enabled and the prerequisites are met, these datasets are available in the Azure portal performance dashboard:

- CPU utilization by SQL Server process
- Memory usage (buffer pool, plan cache)
- Disk I/O latency
- Wait statistics
- Active sessions and blocked processes

For alerting, use Azure Monitor log alert rules against a Log Analytics workspace if you are collecting SQL Server counters with Azure Monitor Agent and data collection rules. For example:

```bash
# Create a log alert for high SQL Server process CPU
az monitor scheduled-query create \
    --name "sql-high-cpu" \
    --resource-group "monitoring-rg" \
    --scopes "/subscriptions/sub-id/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/sql-monitoring-ws" \
    --condition "avg 'cpu_percent' from 'HighCpu' > 90" \
    --condition-query HighCpu="Perf | where ObjectName == 'Process' and CounterName == '% Processor Time' and InstanceName has 'sqlservr' | summarize cpu_percent=avg(CounterValue) by bin(TimeGenerated, 5m), Computer" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --action-groups "/subscriptions/sub-id/resourceGroups/monitoring-rg/providers/microsoft.insights/actionGroups/sql-alerts"
```

## Step 6: Configure Automatic Updates

Automatic updates let you schedule Windows Update and Microsoft Update maintenance windows for supported Windows hosts. They apply Windows and SQL Server updates marked Important or Critical; other SQL Server updates, such as service packs and cumulative updates that are not marked Important or Critical, must be installed manually.

In the Azure Portal, locate the Server - Azure Arc resource, select SQL Server Configuration under Operations, and configure Automatic updates under Update.

The patching configuration specifies:
- Which day of the week to apply updates
- What time to start the maintenance window

Updates and any associated restarts occur during the maintenance window.

## Viewing Everything in the Portal

The Azure Portal provides a rich experience for Arc-enabled SQL Server. On the SQL Server instance page, you can find:

- **Overview** - Version, edition, host, status
- **Best practices assessment** - Latest assessment results and trends
- **Defender for SQL** - Security findings and recommendations
- **Monitoring** - Performance dashboard and metrics
- **Databases** - List of databases on the instance
- **Automated backups** - Backup configuration and history when automated backups are enabled

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

**Set up alerts for critical signals.** At minimum, alert on high CPU and blocked processes when you collect those counters into a Log Analytics workspace.

**Use maintenance windows wisely.** Schedule automatic updates during low-usage periods.

**Review Defender findings regularly.** The vulnerability assessment findings should be reviewed and remediated as part of your regular security hygiene.

## Summary

Azure Arc for SQL Server provides a unified management experience for SQL Server instances running anywhere. By combining automated discovery, best practices assessment, security monitoring, performance tracking, and automatic updates, you can manage your entire SQL Server estate from the Azure Portal. The setup process is straightforward - install the extension, configure the features you need, and start managing from Azure.
