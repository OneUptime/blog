# How to Configure Azure Monitor VM Insights for Virtual Machine Performance Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Monitor, VM Insights, Virtual Machine, Performance Monitoring, Azure Cloud, Infrastructure Monitoring, Observability

Description: Learn how to configure Azure Monitor VM Insights for comprehensive virtual machine performance monitoring, including dependency mapping and health diagnostics.

---

If you manage virtual machines in Azure, you have probably run into situations where a VM starts misbehaving and you have no idea why. CPU spikes, memory pressure, disk bottlenecks - these problems creep up on you. Azure Monitor VM Insights gives you a consolidated view of your VM performance, health, and dependencies without having to piece together metrics from five different dashboards.

In this guide, I will walk you through setting up VM Insights from scratch, configuring the necessary agents, and getting practical value out of the data it collects.

## What Is VM Insights?

VM Insights is a feature within Azure Monitor that provides pre-built performance charts, a dependency map showing how your VMs communicate with each other and external services, and health monitoring. It works for both Azure VMs and Azure Arc-enabled servers running on-premises or in other clouds.

The dependency map alone is worth the setup. It discovers running processes, network connections, and service dependencies automatically. No manual diagramming required.

## Prerequisites

Before you start, make sure you have the following in place:

- An Azure subscription with at least Contributor access to the resource group containing your VMs
- A Log Analytics workspace (VM Insights stores its data here)
- The VMs you want to monitor should be running a supported OS (Windows Server 2012 R2+ or most modern Linux distributions)

If you do not already have a Log Analytics workspace, create one first. You can do this in the Azure Portal under Monitor > Log Analytics workspaces, or use the CLI.

The following command creates a new workspace in your resource group:

```bash
# Create a Log Analytics workspace for VM Insights data
az monitor log-analytics workspace create \
  --resource-group myResourceGroup \
  --workspace-name myVMInsightsWorkspace \
  --location eastus
```

## Step 1: Enable VM Insights from the Azure Portal

The quickest way to get started is through the portal.

1. Navigate to Azure Monitor in the portal
2. Click on Virtual Machines under the Insights section in the left menu
3. You will see a list of your VMs with their monitoring status
4. Select a VM that shows "Not Monitored"
5. Click Enable and follow the configuration wizard

The wizard will ask you to select a Log Analytics workspace. Pick the one you just created (or an existing one). It will also ask about installing the required agents.

## Step 2: Install the Required Agents

VM Insights requires two components on each VM:

- **Azure Monitor Agent (AMA)**: This is the newer, preferred agent that collects performance counters and log data. It replaces the older Log Analytics agent (MMA).
- **Dependency Agent**: This collects process and network dependency data for the map feature.

You can install both using the Azure Portal wizard, but if you are managing many VMs, the CLI or Azure Policy approach is better.

Here is how to install the Azure Monitor Agent extension on a Linux VM:

```bash
# Install Azure Monitor Agent on a Linux VM
az vm extension set \
  --resource-group myResourceGroup \
  --vm-name myLinuxVM \
  --name AzureMonitorLinuxAgent \
  --publisher Microsoft.Azure.Monitor \
  --version 1.0

# Install the Dependency Agent for the map feature
az vm extension set \
  --resource-group myResourceGroup \
  --vm-name myLinuxVM \
  --name DependencyAgentLinux \
  --publisher Microsoft.Azure.Monitoring.DependencyAgent \
  --version 9.10
```

For Windows VMs, use `AzureMonitorWindowsAgent` and `DependencyAgentWindows` as the extension names.

## Step 3: Create a Data Collection Rule

With the Azure Monitor Agent, you need a Data Collection Rule (DCR) that defines what data to collect and where to send it. VM Insights uses a specific DCR configuration.

```bash
# Create a data collection rule for VM Insights
az monitor data-collection rule create \
  --resource-group myResourceGroup \
  --name myVMInsightsDCR \
  --location eastus \
  --data-flows '[{"streams":["Microsoft-InsightsMetrics","Microsoft-ServiceMap"],"destinations":["myWorkspaceDest"]}]' \
  --destinations '{"logAnalytics":[{"workspaceResourceId":"/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.OperationalInsights/workspaces/myVMInsightsWorkspace","name":"myWorkspaceDest"}]}' \
  --data-sources '{"performanceCounters":[{"name":"VMInsightsPerfCounters","streams":["Microsoft-InsightsMetrics"],"samplingFrequencyInSeconds":60,"counterSpecifiers":["\\Processor Information(_Total)\\% Processor Time","\\Memory\\Available Bytes","\\LogicalDisk(_Total)\\% Free Space"]}]}'
```

Then associate the rule with your VM:

```bash
# Associate the DCR with a specific VM
az monitor data-collection rule association create \
  --name myVMAssociation \
  --rule-id /subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Insights/dataCollectionRules/myVMInsightsDCR \
  --resource /subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Compute/virtualMachines/myLinuxVM
```

## Step 4: Enable at Scale with Azure Policy

If you have dozens or hundreds of VMs, configuring each one manually is not practical. Azure Policy can automatically deploy the agents and DCR to every VM in a subscription or management group.

Azure provides built-in policy initiatives for VM Insights:

- "Enable Azure Monitor for VMs" - deploys both agents and creates the DCR association
- "Enable Azure Monitor for Virtual Machine Scale Sets" - same but for VMSS

To assign the policy:

1. Go to Azure Policy in the portal
2. Click Definitions and search for "Enable Azure Monitor for VMs"
3. Select the initiative and click Assign
4. Choose your scope (subscription or resource group)
5. Fill in the parameters (Log Analytics workspace ID, DCR resource ID)
6. Click Review + Create

New VMs created within the scope will automatically get the agents installed.

## Step 5: Explore the Performance View

Once data starts flowing (give it 10-15 minutes), go to Azure Monitor > Virtual Machines > Performance. You will see pre-built charts for:

- CPU utilization (average, P95, min, max)
- Available memory
- Logical disk space used percentage
- Bytes sent/received per second
- Disk IOPS

These charts aggregate data across all your monitored VMs. You can filter by resource group, individual VM, or use the top-N view to see which VMs are consuming the most resources.

The top-N view is extremely useful for capacity planning. If you see three VMs consistently running above 90% CPU, you know where to focus your optimization efforts.

## Step 6: Use the Dependency Map

Navigate to Azure Monitor > Virtual Machines > Map. Select a VM and you will see a visual representation of all inbound and outbound connections. Each node represents a process or an external endpoint.

The map shows you things like:

- Which VMs are talking to your database server
- External IP addresses your VMs are connecting to
- Processes running on each VM and their network activity

This is incredibly valuable during incident response. If a service goes down, you can quickly see which other services depend on it.

## Step 7: Set Up Alerts Based on VM Insights Data

VM Insights data lands in the InsightsMetrics table in your Log Analytics workspace. You can write KQL queries against this table to create alerts.

Here is a query that finds VMs with less than 10% free memory:

```kql
// Find VMs with critically low available memory
InsightsMetrics
| where Namespace == "Memory" and Name == "AvailableMB"
| summarize AvgAvailableMB = avg(Val) by Computer, bin(TimeGenerated, 5m)
| where AvgAvailableMB < 512
| project Computer, AvgAvailableMB, TimeGenerated
| order by AvgAvailableMB asc
```

You can turn this into a log alert rule that fires when any VM drops below your threshold.

## Troubleshooting Common Issues

**Data not appearing**: Check that the Azure Monitor Agent shows a status of "Provisioning succeeded" on the VM's Extensions page. Also verify the DCR association exists.

**Dependency map is empty**: Make sure the Dependency Agent is installed and running. On Linux, check with `systemctl status dependency-agent`. On Windows, look for the "Microsoft Dependency Agent" service.

**Stale data**: The default collection interval is 60 seconds. If you are seeing data that seems delayed, check the time range filter in the portal - it defaults to the last hour.

## Cost Considerations

VM Insights charges are based on the volume of data ingested into your Log Analytics workspace. Performance data is relatively lightweight - expect around 1-3 MB per VM per day. The dependency map data can be heavier if your VMs have many active connections.

To control costs, consider using data collection rules to limit which counters you collect, or set up data retention policies on your workspace.

## Wrapping Up

VM Insights removes a lot of the manual work involved in monitoring virtual machines. The combination of pre-built performance dashboards, automatic dependency discovery, and integration with Log Analytics for custom alerting makes it one of the most practical features in Azure Monitor. Start with a handful of critical VMs, verify the data looks right, and then roll it out at scale using Azure Policy.
