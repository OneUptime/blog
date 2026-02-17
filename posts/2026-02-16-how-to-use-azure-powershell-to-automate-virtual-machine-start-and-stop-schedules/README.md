# How to Use Azure PowerShell to Automate Virtual Machine Start and Stop Schedules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure PowerShell, Virtual Machines, Automation, Cost Optimization, Azure, DevOps, Cloud Management

Description: Learn how to use Azure PowerShell scripts and Azure Automation to create scheduled start and stop operations for virtual machines to reduce cloud costs.

---

Development and testing virtual machines that run 24/7 waste money. If your team works 8 hours a day, those VMs are sitting idle for the other 16 hours and all weekend - burning through your cloud budget with nothing to show for it. Depending on the VM size, you could be spending $200-800 per month on a machine that is only needed during business hours.

The fix is straightforward: shut down VMs when nobody is using them and start them back up before the workday begins. Azure PowerShell makes this easy to automate, and Azure Automation lets you run it on a schedule without any infrastructure to manage. In this post, I will walk through the different approaches, from simple scripts to fully automated schedules.

## Understanding VM States and Cost Implications

Before automating anything, it is important to understand the difference between stopping and deallocating a VM:

- **Stopped (StoppedDeallocated)**: The VM is shut down and the compute resources are released. You are not charged for compute (only for storage and any static IPs). This is what you want.
- **Stopped (from inside the OS)**: The VM's OS is shut down, but the compute allocation is still held. You are still charged for compute. This is not what you want.

Always use `Stop-AzVM` to deallocate VMs properly, not just shutting down the OS from inside the VM.

## Basic PowerShell Script to Stop VMs

Here is a simple script that stops all VMs in a resource group:

```powershell
# Stop all VMs in a specific resource group
# This deallocates the VMs, stopping compute charges

param(
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory = $false)]
    [string]$TagName = "AutoShutdown",

    [Parameter(Mandatory = $false)]
    [string]$TagValue = "true"
)

# Connect to Azure (needed for interactive use, not in Azure Automation)
# Connect-AzAccount

Write-Output "Looking for VMs to stop in resource group: $ResourceGroupName"

# Get all running VMs that have the auto-shutdown tag
$vms = Get-AzVM -ResourceGroupName $ResourceGroupName -Status |
    Where-Object {
        $_.PowerState -eq "VM running" -and
        $_.Tags[$TagName] -eq $TagValue
    }

if ($vms.Count -eq 0) {
    Write-Output "No running VMs found with tag $TagName=$TagValue"
    return
}

Write-Output "Found $($vms.Count) VMs to stop"

# Stop each VM in parallel using jobs for faster execution
$jobs = @()
foreach ($vm in $vms) {
    Write-Output "Stopping VM: $($vm.Name)"
    $jobs += Stop-AzVM -ResourceGroupName $ResourceGroupName -Name $vm.Name -Force -AsJob
}

# Wait for all stop operations to complete
$jobs | Wait-Job | Receive-Job

Write-Output "All VMs stopped successfully"
```

## Basic PowerShell Script to Start VMs

The companion script to start VMs in the morning:

```powershell
# Start all deallocated VMs that have the auto-start tag
param(
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory = $false)]
    [string]$TagName = "AutoShutdown",

    [Parameter(Mandatory = $false)]
    [string]$TagValue = "true"
)

Write-Output "Looking for VMs to start in resource group: $ResourceGroupName"

# Get all deallocated VMs with the auto-shutdown tag
$vms = Get-AzVM -ResourceGroupName $ResourceGroupName -Status |
    Where-Object {
        $_.PowerState -eq "VM deallocated" -and
        $_.Tags[$TagName] -eq $TagValue
    }

if ($vms.Count -eq 0) {
    Write-Output "No deallocated VMs found with tag $TagName=$TagValue"
    return
}

Write-Output "Found $($vms.Count) VMs to start"

# Start VMs in parallel
$jobs = @()
foreach ($vm in $vms) {
    Write-Output "Starting VM: $($vm.Name)"
    $jobs += Start-AzVM -ResourceGroupName $ResourceGroupName -Name $vm.Name -AsJob
}

# Wait for all start operations to complete
$jobs | Wait-Job | Receive-Job

Write-Output "All VMs started successfully"
```

## Using Tags to Control Which VMs Are Managed

Instead of managing all VMs in a resource group, use tags to opt individual VMs in or out of the schedule:

```powershell
# Tag VMs that should be auto-managed
# Run this once to set up the tags

$vmsToManage = @(
    "dev-web-server",
    "dev-api-server",
    "test-db-server",
    "staging-app-server"
)

foreach ($vmName in $vmsToManage) {
    $vm = Get-AzVM -ResourceGroupName "dev-rg" -Name $vmName

    # Add the AutoShutdown tag
    $tags = $vm.Tags
    $tags["AutoShutdown"] = "true"
    $tags["ShutdownTime"] = "19:00"  # Optional: custom shutdown time
    $tags["StartupTime"] = "07:00"   # Optional: custom startup time
    $tags["Timezone"] = "Eastern Standard Time"

    # Update the VM with new tags
    Update-AzVM -ResourceGroupName "dev-rg" -VM $vm -Tag $tags
}
```

## Setting Up Azure Automation

Azure Automation is the right way to run scheduled PowerShell scripts. It provides a managed execution environment with built-in scheduling, logging, and authentication.

### Step 1: Create an Automation Account

```powershell
# Create an Automation Account with a system-assigned managed identity
New-AzAutomationAccount `
    -ResourceGroupName "automation-rg" `
    -Name "vm-scheduler" `
    -Location "eastus" `
    -AssignSystemIdentity
```

### Step 2: Grant Permissions to the Managed Identity

The Automation Account's managed identity needs permissions to start and stop VMs:

```powershell
# Get the managed identity principal ID
$automationAccount = Get-AzAutomationAccount `
    -ResourceGroupName "automation-rg" `
    -Name "vm-scheduler"

$principalId = $automationAccount.Identity.PrincipalId

# Grant Virtual Machine Contributor role on the resource group
New-AzRoleAssignment `
    -ObjectId $principalId `
    -RoleDefinitionName "Virtual Machine Contributor" `
    -Scope "/subscriptions/YOUR_SUB_ID/resourceGroups/dev-rg"
```

### Step 3: Create Runbooks

Import your PowerShell scripts as Runbooks:

```powershell
# Create the Stop VMs runbook
$stopRunbookParams = @{
    ResourceGroupName  = "automation-rg"
    AutomationAccountName = "vm-scheduler"
    Name              = "Stop-DevVMs"
    Type              = "PowerShell"
    Description       = "Stops development VMs to save costs during off-hours"
}

# First create the runbook, then import the script content
New-AzAutomationRunbook @stopRunbookParams

# Import the script content
Import-AzAutomationRunbook `
    -ResourceGroupName "automation-rg" `
    -AutomationAccountName "vm-scheduler" `
    -Name "Stop-DevVMs" `
    -Path "./scripts/stop-vms.ps1" `
    -Type PowerShell `
    -Force

# Publish the runbook (makes it available for scheduling)
Publish-AzAutomationRunbook `
    -ResourceGroupName "automation-rg" `
    -AutomationAccountName "vm-scheduler" `
    -Name "Stop-DevVMs"
```

Do the same for the Start VMs runbook:

```powershell
New-AzAutomationRunbook `
    -ResourceGroupName "automation-rg" `
    -AutomationAccountName "vm-scheduler" `
    -Name "Start-DevVMs" `
    -Type "PowerShell" `
    -Description "Starts development VMs before business hours"

Import-AzAutomationRunbook `
    -ResourceGroupName "automation-rg" `
    -AutomationAccountName "vm-scheduler" `
    -Name "Start-DevVMs" `
    -Path "./scripts/start-vms.ps1" `
    -Type PowerShell `
    -Force

Publish-AzAutomationRunbook `
    -ResourceGroupName "automation-rg" `
    -AutomationAccountName "vm-scheduler" `
    -Name "Start-DevVMs"
```

### Step 4: Create Schedules

Now create the schedules for when the runbooks should execute:

```powershell
# Create a schedule to stop VMs at 7 PM Eastern every weekday
$stopSchedule = New-AzAutomationSchedule `
    -ResourceGroupName "automation-rg" `
    -AutomationAccountName "vm-scheduler" `
    -Name "WeekdayShutdown-7PM" `
    -StartTime (Get-Date "19:00:00").AddDays(1) `
    -TimeZone "Eastern Standard Time" `
    -DaysOfWeek Monday, Tuesday, Wednesday, Thursday, Friday `
    -WeekInterval 1 `
    -Description "Stop dev VMs at 7 PM ET on weekdays"

# Create a schedule to start VMs at 7 AM Eastern every weekday
$startSchedule = New-AzAutomationSchedule `
    -ResourceGroupName "automation-rg" `
    -AutomationAccountName "vm-scheduler" `
    -Name "WeekdayStartup-7AM" `
    -StartTime (Get-Date "07:00:00").AddDays(1) `
    -TimeZone "Eastern Standard Time" `
    -DaysOfWeek Monday, Tuesday, Wednesday, Thursday, Friday `
    -WeekInterval 1 `
    -Description "Start dev VMs at 7 AM ET on weekdays"
```

### Step 5: Link Schedules to Runbooks

Connect the schedules to the runbooks with the required parameters:

```powershell
# Link the stop schedule to the stop runbook
Register-AzAutomationScheduledRunbook `
    -ResourceGroupName "automation-rg" `
    -AutomationAccountName "vm-scheduler" `
    -RunbookName "Stop-DevVMs" `
    -ScheduleName "WeekdayShutdown-7PM" `
    -Parameters @{ResourceGroupName = "dev-rg"}

# Link the start schedule to the start runbook
Register-AzAutomationScheduledRunbook `
    -ResourceGroupName "automation-rg" `
    -AutomationAccountName "vm-scheduler" `
    -RunbookName "Start-DevVMs" `
    -ScheduleName "WeekdayStartup-7AM" `
    -Parameters @{ResourceGroupName = "dev-rg"}
```

## Advanced: Multi-Resource-Group Management

For organizations with VMs spread across multiple resource groups, create a runbook that scans across your subscription:

```powershell
# Advanced runbook that manages VMs across all resource groups
# Uses tags to identify which VMs should be managed

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Stop", "Start")]
    [string]$Action
)

# Authenticate using the Automation Account's managed identity
Connect-AzAccount -Identity

# Find all VMs in the subscription with the AutoShutdown tag
$allVMs = Get-AzVM -Status | Where-Object {
    $_.Tags["AutoShutdown"] -eq "true"
}

Write-Output "Found $($allVMs.Count) managed VMs across the subscription"

$jobs = @()

foreach ($vm in $allVMs) {
    $vmState = $vm.PowerState

    if ($Action -eq "Stop" -and $vmState -eq "VM running") {
        Write-Output "Stopping: $($vm.Name) in $($vm.ResourceGroupName)"
        $jobs += Stop-AzVM `
            -ResourceGroupName $vm.ResourceGroupName `
            -Name $vm.Name `
            -Force -AsJob

    } elseif ($Action -eq "Start" -and $vmState -eq "VM deallocated") {
        Write-Output "Starting: $($vm.Name) in $($vm.ResourceGroupName)"
        $jobs += Start-AzVM `
            -ResourceGroupName $vm.ResourceGroupName `
            -Name $vm.Name `
            -AsJob
    } else {
        Write-Output "Skipping $($vm.Name) (current state: $vmState)"
    }
}

if ($jobs.Count -gt 0) {
    Write-Output "Waiting for $($jobs.Count) operations to complete..."
    $jobs | Wait-Job | Receive-Job
    Write-Output "All operations completed"
} else {
    Write-Output "No VMs needed $Action action"
}
```

## Cost Savings Estimation

Here is a quick way to estimate your savings. The script below calculates how much you are saving by shutting down VMs during off-hours:

```powershell
# Estimate cost savings from VM auto-shutdown
# Assumes 16 hours off per weekday + 48 hours on weekends = 128 hours/week off

$vms = Get-AzVM -ResourceGroupName "dev-rg" -Status |
    Where-Object { $_.Tags["AutoShutdown"] -eq "true" }

$totalMonthlySavings = 0

foreach ($vm in $vms) {
    $vmSize = $vm.HardwareProfile.VmSize

    # Get the hourly cost for this VM size (approximate)
    # You would replace this with actual pricing data
    $hourlyCost = switch ($vmSize) {
        "Standard_B2s"    { 0.0416 }
        "Standard_D2s_v3" { 0.096 }
        "Standard_D4s_v3" { 0.192 }
        "Standard_E4s_v3" { 0.252 }
        default           { 0.10 }
    }

    # Calculate monthly savings (128 off-hours per week * 4.33 weeks)
    $offHoursPerMonth = 128 * 4.33
    $monthlySaving = $hourlyCost * $offHoursPerMonth

    Write-Output "$($vm.Name) ($vmSize): ~$([math]::Round($monthlySaving, 2))/month saved"
    $totalMonthlySavings += $monthlySaving
}

Write-Output "`nTotal estimated monthly savings: $([math]::Round($totalMonthlySavings, 2))"
Write-Output "Total estimated yearly savings: $([math]::Round($totalMonthlySavings * 12, 2))"
```

## Handling Exceptions and Notifications

Your automation should handle failures gracefully and notify the team:

```powershell
# Enhanced stop script with error handling and notification
param(
    [string]$ResourceGroupName = "dev-rg",
    [string]$WebhookUrl = ""  # Slack or Teams webhook URL
)

Connect-AzAccount -Identity

$results = @{
    Stopped = @()
    Failed  = @()
    Skipped = @()
}

$vms = Get-AzVM -ResourceGroupName $ResourceGroupName -Status |
    Where-Object { $_.Tags["AutoShutdown"] -eq "true" -and $_.PowerState -eq "VM running" }

foreach ($vm in $vms) {
    try {
        Stop-AzVM -ResourceGroupName $ResourceGroupName -Name $vm.Name -Force -ErrorAction Stop
        $results.Stopped += $vm.Name
        Write-Output "Stopped: $($vm.Name)"
    } catch {
        $results.Failed += @{ Name = $vm.Name; Error = $_.Exception.Message }
        Write-Warning "Failed to stop $($vm.Name): $($_.Exception.Message)"
    }
}

# Send a summary notification if a webhook URL is configured
if ($WebhookUrl -and ($results.Failed.Count -gt 0)) {
    $body = @{
        text = "VM Shutdown Summary:`n" +
               "Stopped: $($results.Stopped -join ', ')`n" +
               "Failed: $(($results.Failed | ForEach-Object { $_.Name }) -join ', ')"
    } | ConvertTo-Json

    Invoke-RestMethod -Uri $WebhookUrl -Method Post -Body $body -ContentType "application/json"
}

# Output the summary
Write-Output "`nSummary:"
Write-Output "  Stopped: $($results.Stopped.Count) VMs"
Write-Output "  Failed: $($results.Failed.Count) VMs"
```

## Alternative: Azure Auto-Shutdown Feature

For simpler scenarios, Azure has a built-in auto-shutdown feature on individual VMs that does not require Automation accounts:

```powershell
# Enable auto-shutdown on a VM at 7 PM Eastern
$vm = Get-AzVM -ResourceGroupName "dev-rg" -Name "dev-web-server"

# Create an auto-shutdown schedule directly on the VM
New-AzResource `
    -ResourceId "/subscriptions/SUB_ID/resourceGroups/dev-rg/providers/Microsoft.DevTestLab/schedules/shutdown-computevm-dev-web-server" `
    -Location "eastus" `
    -Properties @{
        status           = "Enabled"
        taskType         = "ComputeVmShutdownTask"
        dailyRecurrence  = @{ time = "1900" }
        timeZoneId       = "Eastern Standard Time"
        targetResourceId = $vm.Id
        notificationSettings = @{
            status     = "Enabled"
            emailRecipient = "team@company.com"
            timeInMinutes  = 30  # Notify 30 minutes before shutdown
        }
    } `
    -Force
```

The limitation of this built-in feature is that it only handles shutdown, not startup. You still need Azure Automation or a similar solution for automatic startup.

## Wrapping Up

Automating VM start and stop schedules is one of the easiest cost optimizations in Azure. Tag your non-production VMs, create PowerShell runbooks in Azure Automation, and schedule them for your team's working hours. The math is simple - if a VM does not need to run 24/7, shutting it down during off-hours saves roughly 65-75% of the compute cost. For a team with 10 development VMs, that can easily add up to thousands of dollars per month. Set it up once and let the automation handle it.
