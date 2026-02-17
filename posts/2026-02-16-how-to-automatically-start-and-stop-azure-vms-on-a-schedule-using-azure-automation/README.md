# How to Automatically Start and Stop Azure VMs on a Schedule Using Azure Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Automation, Virtual Machines, Cost Optimization, Scheduling, PowerShell, FinOps

Description: Save money on Azure by automatically shutting down development and test VMs outside business hours using Azure Automation runbooks and schedules.

---

One of the fastest ways to cut your Azure bill is to stop paying for virtual machines when nobody is using them. Development and test environments, demo servers, and batch processing VMs often run 24/7 even though they are only needed during business hours. By automatically stopping these VMs at the end of the day and starting them in the morning, you can save up to 65% on those resources without any manual intervention.

Azure Automation makes this straightforward with PowerShell runbooks and schedules. In this post, I will walk through three approaches: a simple script, a tag-based approach for larger environments, and the built-in Start/Stop VMs feature.

## Approach 1: Simple PowerShell Runbook

This is the most straightforward approach. You write two runbooks - one to stop VMs and one to start them - then schedule each one.

### The Stop VMs Runbook

```powershell
# Runbook: Stop-DevVMs
# Purpose: Stop all VMs in a specific resource group to save costs
# Intended to run at end of business hours

param(
    # Resource group containing the VMs to stop
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName
)

# Authenticate using the Automation account's managed identity
Connect-AzAccount -Identity

# Get all VMs in the resource group
$vms = Get-AzVM -ResourceGroupName $ResourceGroupName -Status

$stoppedCount = 0
$alreadyStoppedCount = 0

foreach ($vm in $vms) {
    # Check the current power state
    $powerState = ($vm.Statuses | Where-Object { $_.Code -like 'PowerState/*' }).DisplayStatus

    if ($powerState -eq 'VM running') {
        Write-Output "Stopping VM: $($vm.Name)"
        # Use -Force to skip confirmation and -NoWait for parallel stop
        Stop-AzVM -ResourceGroupName $ResourceGroupName -Name $vm.Name -Force
        Write-Output "  Deallocated successfully"
        $stoppedCount++
    } else {
        Write-Output "VM $($vm.Name) is already in state: $powerState - skipping"
        $alreadyStoppedCount++
    }
}

Write-Output ""
Write-Output "Summary: Stopped $stoppedCount VMs, $alreadyStoppedCount were already stopped"
```

### The Start VMs Runbook

```powershell
# Runbook: Start-DevVMs
# Purpose: Start all VMs in a specific resource group at the beginning of business hours

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName
)

Connect-AzAccount -Identity

$vms = Get-AzVM -ResourceGroupName $ResourceGroupName -Status

$startedCount = 0

foreach ($vm in $vms) {
    $powerState = ($vm.Statuses | Where-Object { $_.Code -like 'PowerState/*' }).DisplayStatus

    if ($powerState -eq 'VM deallocated') {
        Write-Output "Starting VM: $($vm.Name)"
        Start-AzVM -ResourceGroupName $ResourceGroupName -Name $vm.Name
        Write-Output "  Started successfully"
        $startedCount++
    } else {
        Write-Output "VM $($vm.Name) is in state: $powerState - skipping"
    }
}

Write-Output "Summary: Started $startedCount VMs"
```

### Create the Schedules

```bash
# Create the evening stop schedule - runs Monday-Friday at 7 PM
az automation schedule create \
  --resource-group rg-automation \
  --automation-account-name aa-operations \
  --name "Weekday-7PM-Stop" \
  --frequency Week \
  --interval 1 \
  --start-time "2026-02-16T19:00:00" \
  --time-zone "Eastern Standard Time" \
  --description "Stop dev VMs at 7 PM on weekdays"

# Create the morning start schedule - runs Monday-Friday at 7 AM
az automation schedule create \
  --resource-group rg-automation \
  --automation-account-name aa-operations \
  --name "Weekday-7AM-Start" \
  --frequency Week \
  --interval 1 \
  --start-time "2026-02-17T07:00:00" \
  --time-zone "Eastern Standard Time" \
  --description "Start dev VMs at 7 AM on weekdays"
```

Then link the schedules to the runbooks through the portal (Runbook > Schedules > Add a schedule), specifying the resource group name as a parameter.

## Approach 2: Tag-Based Start/Stop

For larger environments with VMs spread across multiple resource groups, a tag-based approach is much more maintainable. Instead of hard-coding resource groups, you tag VMs with their desired schedule and the runbook dynamically discovers them.

### Tag Convention

Add these tags to your VMs:

- `AutoShutdown`: `true` - indicates this VM should be auto-managed
- `ShutdownTime`: `19:00` - when to stop (optional, for fine-grained control)
- `StartTime`: `07:00` - when to start (optional)

```bash
# Tag a VM for auto-shutdown
az vm update \
  --resource-group rg-dev \
  --name dev-api-server \
  --set tags.AutoShutdown=true tags.ShutdownTime=19:00 tags.StartTime=07:00
```

### Tag-Based Stop Runbook

```powershell
# Runbook: Stop-TaggedVMs
# Purpose: Stop all VMs tagged with AutoShutdown=true across all resource groups
# Uses tags for dynamic VM discovery instead of hard-coded resource groups

Connect-AzAccount -Identity

# Find all VMs with the AutoShutdown tag set to true
$taggedVMs = Get-AzResource -TagName "AutoShutdown" -TagValue "true" -ResourceType "Microsoft.Compute/virtualMachines"

Write-Output "Found $($taggedVMs.Count) VMs tagged for auto-shutdown"

$jobs = @()

foreach ($vmResource in $taggedVMs) {
    # Get the full VM object with status information
    $vm = Get-AzVM -ResourceGroupName $vmResource.ResourceGroupName -Name $vmResource.Name -Status
    $powerState = ($vm.Statuses | Where-Object { $_.Code -like 'PowerState/*' }).DisplayStatus

    if ($powerState -eq 'VM running') {
        Write-Output "Stopping: $($vm.Name) in $($vmResource.ResourceGroupName)"

        # Start the stop operation asynchronously for faster execution
        # The -AsJob flag returns immediately and runs in the background
        $job = Stop-AzVM `
            -ResourceGroupName $vmResource.ResourceGroupName `
            -Name $vm.Name `
            -Force `
            -AsJob
        $jobs += $job
    } else {
        Write-Output "Skipping $($vm.Name) - already in state: $powerState"
    }
}

# Wait for all stop jobs to complete
if ($jobs.Count -gt 0) {
    Write-Output ""
    Write-Output "Waiting for all stop operations to complete..."
    $jobs | Wait-Job | Receive-Job

    Write-Output ""
    Write-Output "All stop operations completed"
}
```

The `-AsJob` flag is important here. Without it, the script stops each VM sequentially, which can take a long time in large environments. With `-AsJob`, all the stop operations run in parallel.

### Tag-Based Start Runbook

```powershell
# Runbook: Start-TaggedVMs
# Purpose: Start all VMs tagged with AutoShutdown=true
# Mirror of the stop runbook but starts VMs instead

Connect-AzAccount -Identity

$taggedVMs = Get-AzResource -TagName "AutoShutdown" -TagValue "true" -ResourceType "Microsoft.Compute/virtualMachines"

Write-Output "Found $($taggedVMs.Count) VMs tagged for auto-start"

$jobs = @()

foreach ($vmResource in $taggedVMs) {
    $vm = Get-AzVM -ResourceGroupName $vmResource.ResourceGroupName -Name $vmResource.Name -Status
    $powerState = ($vm.Statuses | Where-Object { $_.Code -like 'PowerState/*' }).DisplayStatus

    if ($powerState -eq 'VM deallocated') {
        Write-Output "Starting: $($vm.Name) in $($vmResource.ResourceGroupName)"
        $job = Start-AzVM `
            -ResourceGroupName $vmResource.ResourceGroupName `
            -Name $vm.Name `
            -AsJob
        $jobs += $job
    } else {
        Write-Output "Skipping $($vm.Name) - already in state: $powerState"
    }
}

if ($jobs.Count -gt 0) {
    Write-Output "Waiting for all start operations to complete..."
    $jobs | Wait-Job | Receive-Job
    Write-Output "All start operations completed"
}
```

## Approach 3: Auto-Shutdown Feature (Single VM)

For individual VMs, Azure has a built-in auto-shutdown feature that requires zero scripting:

```bash
# Enable auto-shutdown on a single VM
# This uses the DevTest Labs shutdown schedule feature
az vm auto-shutdown \
  --resource-group rg-dev \
  --name dev-api-server \
  --time 1900 \
  --timezone "Eastern Standard Time" \
  --email "dev-team@company.com"
```

The limitation is that this only handles shutdown, not startup. And it works per VM, so managing it across dozens of VMs gets tedious. For anything beyond a handful of VMs, use the runbook approach.

## Handling Exceptions

Real environments always have exceptions. Maybe someone is working late and needs their VM to stay running, or there is a deployment happening over the weekend.

### Skip Tag

Add an override tag that the runbook checks:

```powershell
# Add this check inside the foreach loop of the stop runbook
# Check for an override tag that prevents shutdown
$vmTags = (Get-AzResource -ResourceId $vmResource.ResourceId).Tags
if ($vmTags.ContainsKey("SkipAutoShutdown") -and $vmTags["SkipAutoShutdown"] -eq "true") {
    Write-Output "Skipping $($vm.Name) - SkipAutoShutdown tag is set"
    continue
}
```

Developers can set `SkipAutoShutdown=true` on their VM when they need it to stay running, and remove the tag when they are done.

### Holiday Calendar

You probably do not want VMs starting up on holidays. Create a simple holiday check:

```powershell
# Simple holiday check at the beginning of the start runbook
# Add your company's holidays to this list
$holidays = @(
    "2026-01-01", # New Year's Day
    "2026-01-19", # MLK Day
    "2026-02-16", # Presidents' Day
    "2026-05-25", # Memorial Day
    "2026-07-04", # Independence Day
    "2026-09-07", # Labor Day
    "2026-11-26", # Thanksgiving
    "2026-12-25"  # Christmas
)

$today = (Get-Date).ToString("yyyy-MM-dd")
if ($holidays -contains $today) {
    Write-Output "Today ($today) is a holiday. Skipping VM start."
    exit
}

# Also skip weekends
if ((Get-Date).DayOfWeek -in @('Saturday', 'Sunday')) {
    Write-Output "Today is a weekend. Skipping VM start."
    exit
}
```

## Calculating Your Savings

A quick way to estimate savings: if a VM costs $200/month running 24/7 and you shut it down from 7 PM to 7 AM on weekdays plus all weekend, that is roughly 76% of the month it is off. Your savings would be approximately $152/month per VM. Multiply that across your dev and test fleet and the numbers add up quickly.

```bash
# Quick way to check how much your running VMs cost per month
# This lists all running VMs with their sizes
az vm list -d \
  --query "[?powerState=='VM running'].{name:name, rg:resourceGroup, size:hardwareProfile.vmSize, location:location}" \
  --output table
```

## Monitoring and Alerting

Set up alerts so you know if the automation fails:

1. In your Automation account, go to Alerts
2. Create an alert on the "Total Jobs" metric with a filter for Status = Failed and Runbook Name = your runbook names
3. Route the alert to your ops team

You do not want to find out on Monday morning that the start runbook failed and nobody can access their dev environment.

## Wrapping Up

Automatically starting and stopping VMs on a schedule is one of the highest-ROI automation tasks you can implement. The tag-based approach scales well across large environments, and the combination of managed identity authentication with parallel job execution keeps things fast and secure. Start by tagging your dev and test VMs this week, deploy the runbooks, and watch your next Azure bill shrink.
