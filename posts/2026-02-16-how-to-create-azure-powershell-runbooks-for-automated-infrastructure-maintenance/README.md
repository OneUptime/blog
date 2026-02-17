# How to Create Azure PowerShell Runbooks for Automated Infrastructure Maintenance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, PowerShell, Automation, Runbooks, Infrastructure Maintenance, DevOps, Cloud

Description: Create Azure Automation PowerShell runbooks to automate common infrastructure maintenance tasks like cleanup, scaling, and compliance checks.

---

Every Azure environment accumulates cruft over time. Unattached disks pile up, old snapshots eat storage costs, and dev VMs that should have been deleted weeks ago keep running. Manually cleaning these up is tedious and unreliable. Azure Automation runbooks let you write PowerShell scripts that run on a schedule or on demand, handling these maintenance tasks automatically.

This post covers practical runbook examples for common infrastructure maintenance tasks - from resource cleanup to automated scaling to compliance enforcement.

## Setting Up Azure Automation

First, you need an Azure Automation account. If you are managing this with Terraform or Bicep, great. If not, here is the quick portal-free setup.

```powershell
# Create the Automation Account
New-AzAutomationAccount `
  -ResourceGroupName "rg-automation" `
  -Name "aa-infra-maintenance" `
  -Location "eastus" `
  -AssignSystemIdentity

# Grant the Automation Account's managed identity Contributor access
# to the subscription (or specific resource groups for least privilege)
$automationPrincipalId = (Get-AzAutomationAccount `
  -ResourceGroupName "rg-automation" `
  -Name "aa-infra-maintenance").Identity.PrincipalId

New-AzRoleAssignment `
  -ObjectId $automationPrincipalId `
  -RoleDefinitionName "Contributor" `
  -Scope "/subscriptions/$(Get-AzContext | Select-Object -ExpandProperty Subscription | Select-Object -ExpandProperty Id)"
```

## Runbook 1: Clean Up Unattached Managed Disks

Orphaned managed disks happen when VMs are deleted but their disks are left behind. This runbook finds and deletes them.

```powershell
# Runbook: Remove-UnattachedDisks.ps1
# Finds and removes managed disks that are not attached to any VM

# Authenticate using the Automation Account's managed identity
Connect-AzAccount -Identity

# Get all managed disks in the subscription
$allDisks = Get-AzDisk

# Filter to disks that have no owner (not attached to a VM)
$unattachedDisks = $allDisks | Where-Object {
    $_.ManagedBy -eq $null -and
    $_.DiskState -eq "Unattached"
}

Write-Output "Found $($unattachedDisks.Count) unattached disks"

foreach ($disk in $unattachedDisks) {
    # Skip disks created in the last 7 days (they might be intentionally unattached)
    $diskAge = (Get-Date) - $disk.TimeCreated
    if ($diskAge.TotalDays -lt 7) {
        Write-Output "  Skipping $($disk.Name) - created $([math]::Round($diskAge.TotalDays, 1)) days ago (too recent)"
        continue
    }

    # Skip disks tagged with "keep" or "do-not-delete"
    if ($disk.Tags.ContainsKey("keep") -or $disk.Tags.ContainsKey("do-not-delete")) {
        Write-Output "  Skipping $($disk.Name) - tagged for retention"
        continue
    }

    Write-Output "  Deleting $($disk.Name) in $($disk.ResourceGroupName) (age: $([math]::Round($diskAge.TotalDays, 0)) days, size: $($disk.DiskSizeGB) GB)"

    Remove-AzDisk `
        -ResourceGroupName $disk.ResourceGroupName `
        -DiskName $disk.Name `
        -Force
}

Write-Output "Cleanup complete"
```

## Runbook 2: Stop Dev VMs Outside Business Hours

Save money by shutting down development VMs at night and on weekends.

```powershell
# Runbook: Stop-DevVMs.ps1
# Stops all VMs tagged with environment=dev

Connect-AzAccount -Identity

# Get all VMs tagged as dev
$devVMs = Get-AzVM -Status | Where-Object {
    $_.Tags["environment"] -eq "dev" -and
    $_.PowerState -eq "VM running"
}

Write-Output "Found $($devVMs.Count) running dev VMs"

foreach ($vm in $devVMs) {
    # Check for an override tag that prevents auto-shutdown
    if ($vm.Tags.ContainsKey("auto-shutdown") -and $vm.Tags["auto-shutdown"] -eq "disabled") {
        Write-Output "  Skipping $($vm.Name) - auto-shutdown disabled"
        continue
    }

    Write-Output "  Stopping $($vm.Name) in $($vm.ResourceGroupName)"

    # Deallocate to stop billing
    Stop-AzVM `
        -ResourceGroupName $vm.ResourceGroupName `
        -Name $vm.Name `
        -Force `
        -NoWait
}

Write-Output "Shutdown commands sent for all eligible dev VMs"
```

## Runbook 3: Start Dev VMs in the Morning

The complement to the shutdown runbook - start VMs at the beginning of the workday.

```powershell
# Runbook: Start-DevVMs.ps1
# Starts all VMs tagged with environment=dev that are deallocated

Connect-AzAccount -Identity

# Get all deallocated dev VMs
$stoppedDevVMs = Get-AzVM -Status | Where-Object {
    $_.Tags["environment"] -eq "dev" -and
    $_.PowerState -eq "VM deallocated"
}

Write-Output "Found $($stoppedDevVMs.Count) stopped dev VMs"

foreach ($vm in $stoppedDevVMs) {
    # Only start VMs that have the auto-start tag
    if ($vm.Tags.ContainsKey("auto-start") -and $vm.Tags["auto-start"] -eq "enabled") {
        Write-Output "  Starting $($vm.Name) in $($vm.ResourceGroupName)"
        Start-AzVM `
            -ResourceGroupName $vm.ResourceGroupName `
            -Name $vm.Name `
            -NoWait
    } else {
        Write-Output "  Skipping $($vm.Name) - no auto-start tag"
    }
}

Write-Output "Start commands sent for eligible dev VMs"
```

## Runbook 4: Delete Old Snapshots

Snapshots taken for backups or troubleshooting should not live forever.

```powershell
# Runbook: Remove-OldSnapshots.ps1
# Deletes snapshots older than 30 days

Connect-AzAccount -Identity

$maxAgeDays = 30
$cutoffDate = (Get-Date).AddDays(-$maxAgeDays)

# Get all snapshots in the subscription
$snapshots = Get-AzSnapshot

$oldSnapshots = $snapshots | Where-Object {
    $_.TimeCreated -lt $cutoffDate
}

Write-Output "Found $($oldSnapshots.Count) snapshots older than $maxAgeDays days"

$totalSizeGB = 0

foreach ($snapshot in $oldSnapshots) {
    # Skip snapshots with retention tags
    if ($snapshot.Tags.ContainsKey("retain-until")) {
        $retainUntil = [DateTime]::Parse($snapshot.Tags["retain-until"])
        if ($retainUntil -gt (Get-Date)) {
            Write-Output "  Skipping $($snapshot.Name) - retained until $retainUntil"
            continue
        }
    }

    $age = ((Get-Date) - $snapshot.TimeCreated).Days
    $totalSizeGB += $snapshot.DiskSizeGB

    Write-Output "  Deleting $($snapshot.Name) (age: $age days, size: $($snapshot.DiskSizeGB) GB)"

    Remove-AzSnapshot `
        -ResourceGroupName $snapshot.ResourceGroupName `
        -SnapshotName $snapshot.Name `
        -Force
}

Write-Output "Cleanup complete. Freed approximately $totalSizeGB GB"
```

## Runbook 5: Tag Compliance Report

Generate a report of resources that are missing required tags.

```powershell
# Runbook: Check-TagCompliance.ps1
# Reports resources missing required tags

Connect-AzAccount -Identity

# Define required tags for production resources
$requiredTags = @("environment", "cost-center", "owner", "team")

# Get all resources
$resources = Get-AzResource

$nonCompliant = @()

foreach ($resource in $resources) {
    $missingTags = @()

    foreach ($tag in $requiredTags) {
        if (-not $resource.Tags -or -not $resource.Tags.ContainsKey($tag)) {
            $missingTags += $tag
        }
    }

    if ($missingTags.Count -gt 0) {
        $nonCompliant += [PSCustomObject]@{
            ResourceName  = $resource.Name
            ResourceType  = $resource.ResourceType
            ResourceGroup = $resource.ResourceGroupName
            MissingTags   = ($missingTags -join ", ")
        }
    }
}

Write-Output "=== Tag Compliance Report ==="
Write-Output "Total resources checked: $($resources.Count)"
Write-Output "Non-compliant resources: $($nonCompliant.Count)"
Write-Output ""

if ($nonCompliant.Count -gt 0) {
    Write-Output "Non-compliant resources:"
    $nonCompliant | Format-Table -AutoSize
}
```

## Publishing and Scheduling Runbooks

Once you have your runbooks written, publish them to the Automation Account and set up schedules.

```powershell
# Import the runbook
Import-AzAutomationRunbook `
  -ResourceGroupName "rg-automation" `
  -AutomationAccountName "aa-infra-maintenance" `
  -Name "Remove-UnattachedDisks" `
  -Path "./Remove-UnattachedDisks.ps1" `
  -Type PowerShell `
  -Published

# Create a weekly schedule
New-AzAutomationSchedule `
  -ResourceGroupName "rg-automation" `
  -AutomationAccountName "aa-infra-maintenance" `
  -Name "weekly-sunday-2am" `
  -StartTime (Get-Date "02:00").AddDays(1) `
  -WeekInterval 1 `
  -DaysOfWeek Sunday `
  -TimeZone "Eastern Standard Time"

# Link the runbook to the schedule
Register-AzAutomationScheduledRunbook `
  -ResourceGroupName "rg-automation" `
  -AutomationAccountName "aa-infra-maintenance" `
  -RunbookName "Remove-UnattachedDisks" `
  -ScheduleName "weekly-sunday-2am"
```

For the VM start/stop runbooks, create two schedules:

```powershell
# Stop VMs at 7 PM on weekdays
New-AzAutomationSchedule `
  -ResourceGroupName "rg-automation" `
  -AutomationAccountName "aa-infra-maintenance" `
  -Name "weekday-7pm" `
  -StartTime (Get-Date "19:00").AddDays(1) `
  -WeekInterval 1 `
  -DaysOfWeek Monday, Tuesday, Wednesday, Thursday, Friday `
  -TimeZone "Eastern Standard Time"

# Start VMs at 8 AM on weekdays
New-AzAutomationSchedule `
  -ResourceGroupName "rg-automation" `
  -AutomationAccountName "aa-infra-maintenance" `
  -Name "weekday-8am" `
  -StartTime (Get-Date "08:00").AddDays(1) `
  -WeekInterval 1 `
  -DaysOfWeek Monday, Tuesday, Wednesday, Thursday, Friday `
  -TimeZone "Eastern Standard Time"
```

## Error Handling and Notifications

Add error handling and send notifications when something goes wrong.

```powershell
try {
    # Main runbook logic here
    Connect-AzAccount -Identity
    # ... your cleanup code ...
}
catch {
    Write-Error "Runbook failed: $($_.Exception.Message)"

    # Optionally send an alert through a Logic App or webhook
    $body = @{
        runbook = "Remove-UnattachedDisks"
        error   = $_.Exception.Message
        time    = (Get-Date -Format o)
    } | ConvertTo-Json

    Invoke-RestMethod `
        -Uri $env:ALERT_WEBHOOK_URL `
        -Method Post `
        -Body $body `
        -ContentType "application/json"

    throw
}
```

## Conclusion

Azure Automation runbooks are the workhorses of infrastructure maintenance. They handle the repetitive, time-consuming tasks that would otherwise fall through the cracks - cleaning up orphaned resources, managing VM schedules, enforcing tag compliance, and keeping costs under control. By scheduling them to run regularly, you keep your Azure environment clean and well-managed without any manual effort.
