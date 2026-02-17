# How to Create a PowerShell Runbook in Azure Automation and Schedule It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Automation, PowerShell, Runbook, Scheduling, DevOps, Infrastructure Automation

Description: A hands-on guide to creating your first PowerShell runbook in Azure Automation and setting up a schedule to run it automatically.

---

Azure Automation is one of those services that flies under the radar but can save your team hours of repetitive work every week. At its core, it lets you write scripts (called runbooks) and run them on a schedule or on demand, without needing to maintain any infrastructure. PowerShell runbooks are the most popular type because PowerShell has first-class support for managing Azure resources through the Az modules.

In this post, I will walk through creating a PowerShell runbook from scratch, testing it, publishing it, and setting up a schedule so it runs automatically.

## Prerequisites

Before you start, make sure you have:

- An Azure subscription
- An Azure Automation account (I will show you how to create one if you do not have it)
- Basic familiarity with PowerShell

## Step 1: Create an Azure Automation Account

If you do not already have an Automation account, create one:

```bash
# Create a resource group for automation resources
az group create --name rg-automation --location eastus

# Create an Azure Automation account
# The --assign-identity flag creates a system-assigned managed identity
az automation account create \
  --resource-group rg-automation \
  --name aa-operations \
  --location eastus \
  --assign-identity
```

The system-assigned managed identity is important - it is how your runbook authenticates to Azure without storing credentials. More on that in a moment.

## Step 2: Grant the Managed Identity Permissions

Your runbook needs permissions to manage Azure resources. Assign an appropriate role to the managed identity:

```bash
# Get the managed identity's principal ID
PRINCIPAL_ID=$(az automation account show \
  --resource-group rg-automation \
  --name aa-operations \
  --query "identity.principalId" -o tsv)

# Assign the Contributor role at the subscription level
# Use a more restrictive role in production (e.g., VM Contributor for VM-only tasks)
az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Contributor" \
  --scope "/subscriptions/<your-subscription-id>"
```

In production, follow the principle of least privilege. If your runbook only needs to start and stop VMs, use the "Virtual Machine Contributor" role instead of "Contributor."

## Step 3: Write Your PowerShell Runbook

Let me walk through a practical example: a runbook that generates a report of all unused disks (unattached managed disks) in your subscription and sends the report via email.

Here is the PowerShell script:

```powershell
# Runbook: Get-UnusedDisks
# Purpose: Find all unattached managed disks and output a report
# This uses the system-assigned managed identity for authentication

# Connect to Azure using the managed identity
# The -Identity flag tells Connect-AzAccount to use the managed identity
Connect-AzAccount -Identity

# Get all managed disks in the subscription
$allDisks = Get-AzDisk

# Filter to only unattached disks (no VM owner)
$unusedDisks = $allDisks | Where-Object { $_.ManagedBy -eq $null }

# Calculate total wasted spend (rough estimate based on disk size and type)
$totalWastedGB = ($unusedDisks | Measure-Object -Property DiskSizeGB -Sum).Sum

# Output the report header
Write-Output "================================"
Write-Output "Unused Disk Report - $(Get-Date -Format 'yyyy-MM-dd')"
Write-Output "================================"
Write-Output ""
Write-Output "Total unused disks: $($unusedDisks.Count)"
Write-Output "Total wasted storage: $totalWastedGB GB"
Write-Output ""

# Output details for each unused disk
foreach ($disk in $unusedDisks) {
    Write-Output "Disk: $($disk.Name)"
    Write-Output "  Resource Group: $($disk.ResourceGroupName)"
    Write-Output "  Size: $($disk.DiskSizeGB) GB"
    Write-Output "  SKU: $($disk.Sku.Name)"
    Write-Output "  Created: $($disk.TimeCreated)"
    Write-Output "  Location: $($disk.Location)"
    Write-Output "---"
}

# Output summary recommendation
if ($unusedDisks.Count -gt 0) {
    Write-Output ""
    Write-Output "RECOMMENDATION: Review the disks listed above and delete any that are no longer needed."
    Write-Output "You can delete them with: Remove-AzDisk -ResourceGroupName <rg> -DiskName <name> -Force"
} else {
    Write-Output "No unused disks found. Your subscription is clean!"
}
```

## Step 4: Create the Runbook in Azure Automation

You can create the runbook through the portal or CLI.

### Using the Azure Portal

1. Go to your Automation account in the portal
2. Click "Runbooks" in the left menu under Process Automation
3. Click "+ Create a runbook"
4. Enter a name (e.g., "Get-UnusedDisks")
5. Select "PowerShell" as the runbook type
6. Select "7.2" as the runtime version (or 5.1 if you need older module compatibility)
7. Click Create
8. The editor opens - paste your script
9. Click Save

### Using the Azure CLI

```bash
# Create the runbook resource
# The --type specifies this is a PowerShell runbook
az automation runbook create \
  --resource-group rg-automation \
  --automation-account-name aa-operations \
  --name Get-UnusedDisks \
  --type PowerShell \
  --description "Reports on unattached managed disks in the subscription"

# Upload the script content to the runbook
# The file path points to your local PowerShell script
az automation runbook replace-content \
  --resource-group rg-automation \
  --automation-account-name aa-operations \
  --name Get-UnusedDisks \
  --content @./Get-UnusedDisks.ps1
```

## Step 5: Test the Runbook

Before publishing, test the runbook in the portal:

1. Open the runbook in the portal editor
2. Click "Test pane"
3. Click "Start"
4. Watch the output stream for results and errors

Testing runs the draft version of the runbook without affecting the published version. If something fails, fix the script, save it, and test again.

Common issues during testing:

- **Authentication failures**: Make sure the managed identity has the right role assignments
- **Module not found**: Check that the required Az modules are imported into the Automation account (see the Modules section under Shared Resources)
- **Timeout**: The default timeout is 3 hours. If your script takes longer, you need to optimize it or increase the timeout in the runbook settings

## Step 6: Publish the Runbook

Once testing passes, publish the runbook to make it available for scheduling and on-demand execution:

```bash
# Publish the runbook - this makes the current draft the active version
az automation runbook publish \
  --resource-group rg-automation \
  --automation-account-name aa-operations \
  --name Get-UnusedDisks
```

Or in the portal, simply click the "Publish" button in the runbook editor.

## Step 7: Create a Schedule

Now for the part that makes this truly automated. Create a schedule that triggers the runbook at whatever interval you need.

```bash
# Create a weekly schedule that runs every Monday at 8:00 AM UTC
# The --frequency and --interval control how often it recurs
az automation schedule create \
  --resource-group rg-automation \
  --automation-account-name aa-operations \
  --name "Weekly-Monday-8AM" \
  --description "Runs every Monday at 8 AM UTC" \
  --frequency Week \
  --interval 1 \
  --start-time "2026-02-16T08:00:00Z" \
  --time-zone "UTC"
```

You can also create daily, hourly, or monthly schedules:

```bash
# Daily schedule at midnight
az automation schedule create \
  --resource-group rg-automation \
  --automation-account-name aa-operations \
  --name "Daily-Midnight" \
  --frequency Day \
  --interval 1 \
  --start-time "2026-02-17T00:00:00Z" \
  --time-zone "UTC"

# Every 4 hours
az automation schedule create \
  --resource-group rg-automation \
  --automation-account-name aa-operations \
  --name "Every-4-Hours" \
  --frequency Hour \
  --interval 4 \
  --start-time "2026-02-16T00:00:00Z" \
  --time-zone "UTC"
```

## Step 8: Link the Schedule to the Runbook

Creating a schedule and creating a runbook are separate operations. You need to link them together:

```bash
# Link the schedule to the runbook
# This tells Azure Automation to run Get-UnusedDisks on the Weekly-Monday-8AM schedule
az automation runbook start \
  --resource-group rg-automation \
  --automation-account-name aa-operations \
  --name Get-UnusedDisks \
  --schedule-name "Weekly-Monday-8AM"
```

In the portal, go to the runbook, click "Schedules" under Resources, then click "Add a schedule" and select the schedule you created.

A single runbook can be linked to multiple schedules, and a single schedule can trigger multiple runbooks.

## Adding Parameters to Your Runbook

Most real-world runbooks need parameters. Here is how to add them:

```powershell
# Runbook: Stop-VMsByTag
# Purpose: Stop all VMs with a specific tag value
# Parameters allow this runbook to be reused for different tag values

param(
    # The tag name to filter on
    [Parameter(Mandatory=$true)]
    [string]$TagName,

    # The tag value to match
    [Parameter(Mandatory=$true)]
    [string]$TagValue,

    # Whether to actually stop or just report (dry run)
    [Parameter(Mandatory=$false)]
    [bool]$DryRun = $true
)

# Authenticate using managed identity
Connect-AzAccount -Identity

# Find VMs with the specified tag
$vms = Get-AzVM -Status | Where-Object { $_.Tags[$TagName] -eq $TagValue }

Write-Output "Found $($vms.Count) VMs with tag $TagName=$TagValue"

foreach ($vm in $vms) {
    $powerState = ($vm.Statuses | Where-Object { $_.Code -like 'PowerState/*' }).DisplayStatus

    if ($powerState -eq 'VM running') {
        if ($DryRun) {
            Write-Output "[DRY RUN] Would stop VM: $($vm.Name) in $($vm.ResourceGroupName)"
        } else {
            Write-Output "Stopping VM: $($vm.Name) in $($vm.ResourceGroupName)"
            Stop-AzVM -ResourceGroupName $vm.ResourceGroupName -Name $vm.Name -Force
            Write-Output "  VM stopped successfully"
        }
    } else {
        Write-Output "VM $($vm.Name) is already in state: $powerState - skipping"
    }
}
```

When you link a parameterized runbook to a schedule, you specify the parameter values at link time. Each schedule-runbook link can have different parameter values.

## Viewing Runbook Job History

After your runbook has been running for a while, you will want to check its history:

```bash
# List recent jobs for a specific runbook
az automation job list \
  --resource-group rg-automation \
  --automation-account-name aa-operations \
  --query "[?runbook.name=='Get-UnusedDisks'].{status:status, startTime:startTime, endTime:endTime}" \
  --output table
```

In the portal, go to the runbook and click "Jobs" to see the history. Click on any job to see its output, errors, and warnings.

## Tips for Production Runbooks

- **Always use managed identity authentication.** Never store credentials in runbook variables or scripts.
- **Add error handling.** Use try/catch blocks and Write-Error for failures. Set `$ErrorActionPreference = 'Stop'` at the top to catch all errors.
- **Keep runbooks focused.** One runbook should do one thing well. Chain multiple runbooks using child runbook calls if you need complex workflows.
- **Version control your scripts.** Store your runbook scripts in a Git repository and use CI/CD to deploy updates to Azure Automation.
- **Monitor job failures.** Set up alerts on the Azure Automation job failure metric so you know when a scheduled runbook did not complete successfully.

## Wrapping Up

Azure Automation runbooks with PowerShell give you a managed, serverless way to automate operational tasks across your Azure environment. The combination of managed identity authentication, scheduling, and the full power of PowerShell's Az modules means you can automate nearly any Azure management task without maintaining any infrastructure. Start with a simple reporting runbook like the unused disk example, get comfortable with the workflow, and then expand to more complex automation like resource cleanup, compliance checks, and incident response actions.
