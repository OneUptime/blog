# How to Enable and Configure Azure VM Auto-Shutdown Schedule

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machine, Auto-Shutdown, Cost Optimization, Scheduling, Azure CLI, DevOps

Description: Learn how to configure auto-shutdown schedules on Azure VMs to cut costs by automatically stopping development and test machines after hours.

---

Development and test VMs that run 24/7 are one of the most common sources of wasted cloud spending. Engineers spin up a VM in the morning, do their work, and forget to shut it down when they leave. Multiply that by a team of 20 and you are burning money on idle machines every night and weekend. Azure's auto-shutdown feature solves this by automatically stopping VMs on a schedule you define.

In this post, I will show you how to configure auto-shutdown using the Azure CLI, the portal, and Azure Policy for organization-wide enforcement.

## How Auto-Shutdown Works

Auto-shutdown is a simple scheduling feature built into Azure VM management. You specify a time and timezone, and Azure deallocates the VM at that time every day. The VM is stopped and deallocated, meaning you stop paying for compute resources. You only pay for disk storage while the VM is off.

Important distinction: auto-shutdown stops the VM, but Azure does not include a built-in auto-start feature. If you need VMs to start automatically in the morning, you will need Azure Automation, Logic Apps, or a similar scheduling mechanism. I will cover that later in this post.

## Enabling Auto-Shutdown via the Azure Portal

The simplest way to set up auto-shutdown:

1. Navigate to your VM in the Azure portal.
2. In the left menu, scroll down to "Operations" and click "Auto-shutdown."
3. Toggle "Enable auto-shutdown" to On.
4. Set the shutdown time (e.g., 7:00 PM).
5. Select your timezone.
6. Optionally, configure an email notification to warn users before shutdown.
7. Click "Save."

The notification feature is genuinely useful. It sends an email 30 minutes before the shutdown, giving users a chance to extend or cancel if they are still working.

## Enabling Auto-Shutdown via the Azure CLI

For scripting and automation, use the CLI:

```bash
# Enable auto-shutdown at 7:00 PM Eastern Time
az vm auto-shutdown \
  --resource-group myResourceGroup \
  --name myDevVM \
  --time 1900 \
  --timezone "Eastern Standard Time"
```

The `--time` parameter uses 24-hour format (HHMM). The timezone must be a valid Windows timezone name.

Common timezone values:
- `Eastern Standard Time` (US East)
- `Pacific Standard Time` (US West)
- `UTC`
- `Central European Standard Time`
- `India Standard Time`
- `Japan Standard Time`

## Enabling Auto-Shutdown with Email Notification

To get notified before shutdown:

```bash
# Enable auto-shutdown with email notification 30 minutes before
az vm auto-shutdown \
  --resource-group myResourceGroup \
  --name myDevVM \
  --time 1900 \
  --timezone "Eastern Standard Time" \
  --email "team@example.com"
```

The notification email includes a link to delay or cancel the shutdown for that day. This is a nice touch for those late-night debugging sessions.

## Enabling Auto-Shutdown with a Webhook

For integration with Slack, Teams, or custom systems, use a webhook:

```bash
# Enable auto-shutdown with a webhook notification
az vm auto-shutdown \
  --resource-group myResourceGroup \
  --name myDevVM \
  --time 1900 \
  --timezone "Pacific Standard Time" \
  --webhook "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
```

The webhook receives a JSON payload with details about the pending shutdown, which you can use to post a message in your team's channel.

## Applying Auto-Shutdown to Multiple VMs

If you need to set auto-shutdown on all VMs in a resource group:

```bash
#!/bin/bash
# Enable auto-shutdown on all VMs in a resource group

RESOURCE_GROUP="dev-resources"
SHUTDOWN_TIME="1900"
TIMEZONE="Eastern Standard Time"
EMAIL="devteam@example.com"

# Get all VM names in the resource group
VM_NAMES=$(az vm list \
  --resource-group $RESOURCE_GROUP \
  --query "[].name" \
  --output tsv)

# Apply auto-shutdown to each VM
for VM_NAME in $VM_NAMES; do
  echo "Setting auto-shutdown on $VM_NAME..."
  az vm auto-shutdown \
    --resource-group $RESOURCE_GROUP \
    --name $VM_NAME \
    --time $SHUTDOWN_TIME \
    --timezone "$TIMEZONE" \
    --email "$EMAIL"
  echo "Done: $VM_NAME"
done
```

## Disabling Auto-Shutdown

To turn off auto-shutdown on a VM:

```bash
# Disable auto-shutdown
az vm auto-shutdown \
  --resource-group myResourceGroup \
  --name myDevVM \
  --off
```

## Setting Up Auto-Start with Azure Automation

Azure does not have a built-in auto-start for VMs, but Azure Automation runbooks handle this well.

First, create an Automation Account if you do not have one:

```bash
# Create an Automation Account
az automation account create \
  --resource-group myResourceGroup \
  --name myAutomationAccount \
  --location eastus
```

Azure Automation provides a gallery of pre-built runbooks. The "Start/Stop VMs during off-hours" solution is a popular choice. You can also create a simple custom runbook:

```powershell
# PowerShell runbook to start VMs with a specific tag
# This runs as an Azure Automation runbook with a managed identity

param(
    [string]$ResourceGroupName = "dev-resources"
)

# Connect using the Automation Account's managed identity
Connect-AzAccount -Identity

# Get all VMs in the resource group that have the AutoStart tag
$vms = Get-AzVM -ResourceGroupName $ResourceGroupName |
    Where-Object { $_.Tags["AutoStart"] -eq "true" }

# Start each VM
foreach ($vm in $vms) {
    Write-Output "Starting VM: $($vm.Name)"
    Start-AzVM -ResourceGroupName $ResourceGroupName -Name $vm.Name
    Write-Output "Started: $($vm.Name)"
}
```

Schedule the runbook to run every weekday morning:

1. In the Automation Account, go to "Schedules."
2. Create a new schedule with the desired start time and recurrence.
3. Link the schedule to your runbook.

## Using Azure Logic Apps for Start/Stop Scheduling

Logic Apps provide another approach, with a visual designer:

1. Create a new Logic App.
2. Add a "Recurrence" trigger (e.g., every weekday at 8:00 AM).
3. Add an "Azure VM - Start virtual machine" action.
4. Select the subscription, resource group, and VM.
5. Save and enable the Logic App.

You can create two Logic Apps - one for morning start and one for evening stop - or use the auto-shutdown feature for the stop and Logic Apps only for the start.

## Enforcing Auto-Shutdown with Azure Policy

For organizations, you want to ensure that auto-shutdown is configured on all dev/test VMs. Azure Policy can enforce or audit this:

```json
{
  "if": {
    "allOf": [
      {
        "field": "type",
        "equals": "Microsoft.Compute/virtualMachines"
      },
      {
        "field": "tags['Environment']",
        "in": ["dev", "test", "staging"]
      }
    ]
  },
  "then": {
    "effect": "deployIfNotExists",
    "details": {
      "type": "Microsoft.DevTestLab/schedules",
      "existenceCondition": {
        "field": "Microsoft.DevTestLab/schedules/status",
        "equals": "Enabled"
      },
      "roleDefinitionIds": [
        "/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c"
      ],
      "deployment": {
        "properties": {
          "mode": "incremental",
          "template": {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "resources": [
              {
                "type": "Microsoft.DevTestLab/schedules",
                "apiVersion": "2018-09-15",
                "name": "[concat('shutdown-computevm-', field('name'))]",
                "location": "[field('location')]",
                "properties": {
                  "status": "Enabled",
                  "taskType": "ComputeVmShutdownTask",
                  "dailyRecurrence": {
                    "time": "1900"
                  },
                  "timeZoneId": "Eastern Standard Time",
                  "targetResourceId": "[field('id')]"
                }
              }
            ]
          }
        }
      }
    }
  }
}
```

This policy automatically enables auto-shutdown on any VM tagged with Environment=dev, Environment=test, or Environment=staging.

## Cost Impact

Let me put some numbers to this. Say you have 10 Standard_D4s_v5 VMs for your development team:

| Scenario | Monthly Hours | Monthly Cost |
|----------|--------------|-------------|
| Running 24/7 | 730 hrs/VM | ~$1,400/VM ($14,000 total) |
| Auto-shutdown (weekdays, 10 hrs/day) | 220 hrs/VM | ~$420/VM ($4,200 total) |
| Auto-shutdown (weekdays, 8 hrs/day) | 176 hrs/VM | ~$340/VM ($3,400 total) |

By shutting down dev VMs outside of business hours, you save roughly 70% on compute costs. For 10 VMs, that is nearly $10,000 per month.

## Handling Exceptions

Sometimes a VM needs to stay running past the shutdown time. You have several options:

1. **Notification emails**: Use the notification feature so users can click "delay" when they need more time.
2. **Tags for exceptions**: Tag VMs that should skip auto-shutdown and exclude them from the schedule.
3. **Temporary disable**: Users can manually disable auto-shutdown for a specific day through the portal.
4. **Extended hours schedule**: Set the shutdown later (e.g., midnight) to give a longer buffer while still capturing overnight savings.

## Wrapping Up

Auto-shutdown is one of the quickest wins for Azure cost optimization. It takes less than a minute to configure per VM and can save 50-75% on dev/test compute costs. Pair it with Azure Automation or Logic Apps for auto-start, and your team gets VMs that match their working hours. Enforce it with Azure Policy to make sure no dev VM is left running all night. The savings add up fast, especially as your team grows.
