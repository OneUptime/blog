# How to Set Up Microsoft Defender for Cloud Auto-Provisioning of the Azure Monitor Agent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Microsoft Defender, Azure Monitor Agent, Cloud Security, Auto-Provisioning, Security Monitoring, Azure Policy

Description: Learn how to configure Microsoft Defender for Cloud to auto-provision the Azure Monitor Agent across your subscriptions for consistent security data collection.

---

If you have ever managed a fleet of Azure virtual machines, you know how painful it is to make sure every single one of them has the right monitoring agent installed. Miss one VM, and you have a blind spot. That blind spot is exactly what attackers look for. Microsoft Defender for Cloud solves this problem with auto-provisioning of the Azure Monitor Agent (AMA), which automatically deploys and configures the agent on new and existing VMs so you never have to worry about gaps in coverage.

In this post, I will walk through exactly how to set up auto-provisioning, explain why it matters, and share some practical tips from my own experience running this in production.

## Why Auto-Provisioning Matters

The Azure Monitor Agent is the successor to the legacy Log Analytics agent (also called the MMA or OMS agent). It collects security-relevant logs, performance counters, and event data from your virtual machines and sends them to a Log Analytics workspace where Defender for Cloud can analyze them.

Without auto-provisioning, you would need to manually install the AMA on every VM, configure data collection rules, and keep track of which machines have the agent and which do not. In a dynamic environment where VMs spin up and down constantly, this is a losing battle.

Auto-provisioning takes care of all of this. When a new VM is created, Defender for Cloud automatically installs the AMA extension and associates it with the correct data collection rule. This ensures that every VM in your subscription is covered from the moment it starts running.

## Prerequisites

Before you begin, make sure you have the following in place:

- An active Azure subscription with Microsoft Defender for Cloud enabled (at least the Defender for Servers plan).
- A Log Analytics workspace where security data will be sent.
- The Security Admin or Subscription Owner role on the subscription you want to configure.
- The Azure Monitor Agent requires the VM to have a system-assigned managed identity enabled. Auto-provisioning handles this for you, but it is good to be aware of it.

## Step 1: Navigate to Defender for Cloud Settings

Open the Azure portal and go to Microsoft Defender for Cloud. In the left navigation, click on "Environment settings." You will see a list of your management groups and subscriptions. Click on the subscription you want to configure.

This takes you to the Defender plans page where you can see which plans are enabled. Make sure "Servers" shows as "On" - that is the plan that covers VM security monitoring.

## Step 2: Configure Auto-Provisioning Settings

From the subscription settings page, click on "Settings & monitoring" (sometimes labeled "Auto provisioning" depending on your portal version). You will see a list of extensions and agents that can be auto-provisioned.

Find the entry for "Azure Monitor Agent" or "Log Analytics agent / Azure Monitor Agent." If you are still on the legacy Log Analytics agent, I recommend switching to the AMA since Microsoft is deprecating the MMA.

Toggle the Azure Monitor Agent to "On." When you do this, a configuration panel will open asking you to specify the target workspace and data collection rule.

## Step 3: Create or Select a Data Collection Rule

Data Collection Rules (DCRs) define what data the Azure Monitor Agent collects and where it sends that data. Defender for Cloud can create a default DCR for you, or you can specify a custom one.

For most environments, the default rule works fine. It collects Windows Security Events and Linux Syslog data at the levels that Defender for Cloud needs for its detections.

If you want a custom DCR, you can create one in Azure Monitor first. Here is an example using the Azure CLI to create a basic DCR.

The following script creates a data collection rule that collects common security events from Windows VMs and sends them to your Log Analytics workspace:

```bash
# Set variables for the resource group, workspace, and DCR name
RESOURCE_GROUP="rg-security"
WORKSPACE_NAME="law-security-prod"
DCR_NAME="dcr-defender-security"
LOCATION="eastus"

# Get the workspace resource ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group $RESOURCE_GROUP \
  --workspace-name $WORKSPACE_NAME \
  --query id -o tsv)

# Create the data collection rule with Windows security event collection
az monitor data-collection rule create \
  --name $DCR_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --data-flows "[{\"streams\":[\"Microsoft-SecurityEvent\"],\"destinations\":[\"la-destination\"]}]" \
  --log-analytics "[{\"name\":\"la-destination\",\"workspace-resource-id\":\"$WORKSPACE_ID\"}]" \
  --windows-event-logs "[{\"name\":\"security-events\",\"streams\":[\"Microsoft-SecurityEvent\"],\"x-path-queries\":[\"Security!*[System[(Level=1 or Level=2 or Level=3)]]\"] }]"
```

## Step 4: Assign the Configuration

Back in the Defender for Cloud settings, select your workspace and DCR. You have two workspace options:

1. **Default workspace** - Defender for Cloud creates and manages a workspace for you in each region where you have VMs. This is the simplest option but gives you less control.
2. **Custom workspace** - You specify an existing Log Analytics workspace. This is what I recommend for production environments because it lets you control data retention, access, and costs.

Select your preferred option and click "Apply" or "Save."

## Step 5: Verify the Deployment

After enabling auto-provisioning, Defender for Cloud will start deploying the AMA to existing VMs that do not already have it. This does not happen instantly - it can take up to 24 hours for all existing VMs to get the agent.

For new VMs, the agent is typically installed within minutes of the VM being created.

You can check the deployment status in a few ways. One approach is to look at the extensions on individual VMs. Another is to use Azure Resource Graph to query across all your VMs at once.

This query checks all VMs in your subscription and shows which ones have the AMA extension installed:

```kusto
// Query to find VMs with and without the Azure Monitor Agent extension
Resources
| where type == "microsoft.compute/virtualmachines"
| extend
    vmName = name,
    vmId = id,
    osType = properties.storageProfile.osDisk.osType
| join kind=leftouter (
    Resources
    | where type == "microsoft.compute/virtualmachines/extensions"
    | where name contains "AzureMonitorAgent"
    | extend vmId = tostring(split(id, "/extensions/")[0])
    | project vmId, agentInstalled = true
) on vmId
| extend agentStatus = iff(isnull(agentInstalled), "Not Installed", "Installed")
| project vmName, osType, agentStatus, vmId
| order by agentStatus asc
```

## Step 6: Configure Azure Policy for Enforcement

Behind the scenes, auto-provisioning uses Azure Policy to deploy the AMA extension. You can see these policies in the Azure Policy portal under the "Defender for Cloud" initiative.

If you need tighter control, you can create your own policy assignments. For example, you might want to use a specific DCR for VMs in different regions or apply different collection rules to production versus development environments.

The built-in policy definition "Configure Windows virtual machines to run Azure Monitor Agent" (and its Linux counterpart) can be assigned at the management group level for broad coverage.

## Troubleshooting Common Issues

Here are a few issues I have run into and how to fix them:

**Agent installation fails on existing VMs.** This usually happens when the VM does not have a system-assigned managed identity. Check the VM's identity settings in the portal and enable the system-assigned identity manually if needed.

**Data is not appearing in the workspace.** Give it time - there can be a delay of 10 to 15 minutes before data starts flowing. If it has been longer than that, check the DCR association on the VM and verify the workspace is correct.

**Duplicate agents.** If you are migrating from the legacy Log Analytics agent to the AMA, you might end up with both agents on the same VM. This is actually supported during migration, but you should plan to remove the legacy agent once you have confirmed the AMA is working correctly.

**Policy compliance shows non-compliant resources.** This often happens with VMs that were created before auto-provisioning was enabled. Run a remediation task on the policy to bring them into compliance.

## Cost Considerations

The Azure Monitor Agent itself is free - there is no charge for the agent. However, the data it collects and ingests into your Log Analytics workspace does incur costs. The amount depends on the volume of logs generated by your VMs.

To keep costs manageable, use the DCR to filter the events you actually need rather than collecting everything. Defender for Cloud's default DCR is already optimized for security-relevant events, which is a good baseline.

## Migration from the Legacy Agent

If you are currently using the Log Analytics agent (MMA), Microsoft recommends migrating to the AMA. The migration can run in parallel - both agents can coexist on the same VM during the transition period. Once you have verified that the AMA is collecting all the data you need, you can disable auto-provisioning of the legacy agent and remove it from your VMs.

## Wrapping Up

Setting up auto-provisioning of the Azure Monitor Agent through Defender for Cloud is one of those foundational security tasks that pays dividends over the life of your Azure environment. It eliminates the risk of unmonitored VMs, ensures consistent data collection, and removes the operational burden of manually managing agent installations. The initial setup takes maybe 15 minutes, and after that, every VM in your subscription gets security monitoring coverage automatically. That is a solid return on a small time investment.
