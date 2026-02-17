# How to Write Azure PowerShell Scripts for Automated Resource Group Cleanup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, PowerShell, Automation, Cost Management, Resource Cleanup, DevOps, Cloud Governance

Description: Write Azure PowerShell scripts that automatically clean up stale resource groups based on tags, age, and usage patterns to reduce cloud costs.

---

Every Azure subscription accumulates stale resources over time. Developers spin up resource groups for testing, demos, or proof of concepts, then forget about them. Before you know it, you are paying for dozens of idle VMs, empty storage accounts, and abandoned databases. Automated cleanup scripts solve this by identifying and removing resources that meet certain criteria - old age, specific tags, or lack of activity.

This post walks through writing practical PowerShell scripts for automated Azure resource group cleanup, with safety mechanisms to prevent accidentally deleting production resources.

## The Safety-First Approach

The number one rule of automated cleanup is: never delete something you cannot identify with certainty. Every script in this post follows a pattern of discover, report, confirm, then delete. Production resources should always be excluded through explicit tags or naming conventions.

## Basic Cleanup Script

Start with a script that identifies resource groups older than a specified age and lacking a "persistent" tag.

```powershell
# Clean-StaleResourceGroups.ps1
# Identifies and removes resource groups that are older than a threshold
# and not tagged as persistent or production

[CmdletBinding(SupportsShouldProcess)]
param(
    # Number of days after which a resource group is considered stale
    [int]$MaxAgeDays = 14,

    # Subscription ID to clean up
    [string]$SubscriptionId,

    # If true, actually delete resources. If false, just report.
    [switch]$Execute,

    # Resource group name patterns to always exclude
    [string[]]$ExcludePatterns = @("rg-prod-*", "rg-shared-*", "rg-terraform-*")
)

# Set strict mode for better error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Connect and set subscription context
if ($SubscriptionId) {
    Set-AzContext -SubscriptionId $SubscriptionId | Out-Null
}

$currentSub = (Get-AzContext).Subscription
Write-Host "Working in subscription: $($currentSub.Name) ($($currentSub.Id))" -ForegroundColor Cyan

# Get all resource groups
$allGroups = Get-AzResourceGroup

# Filter out protected resource groups
$candidates = $allGroups | Where-Object {
    $rg = $_

    # Check if any exclude pattern matches
    $excluded = $false
    foreach ($pattern in $ExcludePatterns) {
        if ($rg.ResourceGroupName -like $pattern) {
            $excluded = $true
            break
        }
    }

    # Check for protective tags
    $hasPersistentTag = $rg.Tags -and (
        $rg.Tags.ContainsKey("persistent") -or
        $rg.Tags.ContainsKey("environment") -and $rg.Tags["environment"] -in @("production", "prod") -or
        $rg.Tags.ContainsKey("do-not-delete")
    )

    # Include only if not excluded and not persistent
    -not $excluded -and -not $hasPersistentTag
}

Write-Host "`nFound $($candidates.Count) candidate resource groups out of $($allGroups.Count) total" -ForegroundColor Yellow

# Check age of each candidate by looking at the earliest resource creation
$staleGroups = @()
foreach ($rg in $candidates) {
    # Get resources in the group
    $resources = Get-AzResource -ResourceGroupName $rg.ResourceGroupName

    if ($resources.Count -eq 0) {
        # Empty resource group - check creation time from activity log
        $creationLog = Get-AzActivityLog -ResourceGroupName $rg.ResourceGroupName `
            -StartTime (Get-Date).AddDays(-90) `
            -MaxRecord 1 `
            -WarningAction SilentlyContinue |
            Where-Object { $_.OperationName.Value -like "*resourceGroups/write" } |
            Select-Object -First 1

        $age = if ($creationLog) {
            ((Get-Date) - $creationLog.EventTimestamp).Days
        } else {
            999  # Unknown age, treat as old
        }
    } else {
        # Check when the most recent resource was modified
        $latestActivity = Get-AzActivityLog -ResourceGroupName $rg.ResourceGroupName `
            -StartTime (Get-Date).AddDays(-$MaxAgeDays) `
            -MaxRecord 1 `
            -WarningAction SilentlyContinue

        $age = if ($latestActivity) {
            ((Get-Date) - ($latestActivity | Select-Object -First 1).EventTimestamp).Days
        } else {
            $MaxAgeDays + 1  # No recent activity
        }
    }

    if ($age -ge $MaxAgeDays) {
        $staleGroups += [PSCustomObject]@{
            ResourceGroupName = $rg.ResourceGroupName
            Location          = $rg.Location
            ResourceCount     = $resources.Count
            AgeDays           = $age
            Tags              = ($rg.Tags | ConvertTo-Json -Compress)
        }
    }
}

# Display results
if ($staleGroups.Count -eq 0) {
    Write-Host "`nNo stale resource groups found." -ForegroundColor Green
    return
}

Write-Host "`nStale resource groups ($($staleGroups.Count) found):" -ForegroundColor Red
$staleGroups | Format-Table -AutoSize

# Delete if execution mode is enabled
if ($Execute) {
    Write-Host "`nDELETION MODE ENABLED" -ForegroundColor Red

    foreach ($group in $staleGroups) {
        if ($PSCmdlet.ShouldProcess($group.ResourceGroupName, "Delete resource group")) {
            Write-Host "Deleting: $($group.ResourceGroupName)..." -ForegroundColor Red
            try {
                Remove-AzResourceGroup -Name $group.ResourceGroupName -Force -AsJob
                Write-Host "  Deletion initiated for $($group.ResourceGroupName)" -ForegroundColor Yellow
            }
            catch {
                Write-Warning "  Failed to delete $($group.ResourceGroupName): $_"
            }
        }
    }

    Write-Host "`nDeletion jobs initiated. Use Get-Job to monitor progress." -ForegroundColor Cyan
} else {
    Write-Host "`nDry run mode. Use -Execute to actually delete these resource groups." -ForegroundColor Yellow
}
```

## Tag-Based Cleanup with Expiration Dates

A more sophisticated approach uses expiration date tags. Teams set a `delete-after` tag when creating resources, and the cleanup script honors it.

```powershell
# Clean-ExpiredResourceGroups.ps1
# Deletes resource groups that have passed their tagged expiration date

[CmdletBinding(SupportsShouldProcess)]
param(
    [switch]$Execute,
    [string]$TagName = "delete-after",
    [string]$SubscriptionId
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($SubscriptionId) {
    Set-AzContext -SubscriptionId $SubscriptionId | Out-Null
}

Write-Host "Scanning for resource groups with expired '$TagName' tags..." -ForegroundColor Cyan

# Find resource groups with the expiration tag
$taggedGroups = Get-AzResourceGroup | Where-Object {
    $_.Tags -and $_.Tags.ContainsKey($TagName)
}

Write-Host "Found $($taggedGroups.Count) resource groups with '$TagName' tag" -ForegroundColor Yellow

$expired = @()
$upcoming = @()
$today = Get-Date

foreach ($rg in $taggedGroups) {
    $expirationStr = $rg.Tags[$TagName]

    try {
        $expirationDate = [DateTime]::Parse($expirationStr)
    }
    catch {
        Write-Warning "Invalid date format in $($rg.ResourceGroupName): '$expirationStr'"
        continue
    }

    $daysUntilExpiry = ($expirationDate - $today).Days
    $resources = (Get-AzResource -ResourceGroupName $rg.ResourceGroupName).Count

    $info = [PSCustomObject]@{
        ResourceGroupName = $rg.ResourceGroupName
        ExpirationDate    = $expirationDate.ToString("yyyy-MM-dd")
        DaysRemaining     = $daysUntilExpiry
        ResourceCount     = $resources
        Owner             = if ($rg.Tags.ContainsKey("owner")) { $rg.Tags["owner"] } else { "unknown" }
    }

    if ($daysUntilExpiry -lt 0) {
        $expired += $info
    }
    elseif ($daysUntilExpiry -le 3) {
        $upcoming += $info
    }
}

# Report upcoming expirations
if ($upcoming.Count -gt 0) {
    Write-Host "`nResource groups expiring within 3 days:" -ForegroundColor Yellow
    $upcoming | Format-Table -AutoSize
}

# Report and handle expired groups
if ($expired.Count -eq 0) {
    Write-Host "`nNo expired resource groups found." -ForegroundColor Green
    return
}

Write-Host "`nExpired resource groups ($($expired.Count)):" -ForegroundColor Red
$expired | Format-Table -AutoSize

if ($Execute) {
    foreach ($group in $expired) {
        if ($PSCmdlet.ShouldProcess($group.ResourceGroupName, "Delete expired resource group")) {
            Write-Host "Deleting expired group: $($group.ResourceGroupName) (expired $([Math]::Abs($group.DaysRemaining)) days ago)" -ForegroundColor Red
            Remove-AzResourceGroup -Name $group.ResourceGroupName -Force -AsJob
        }
    }
} else {
    Write-Host "`nDry run. Use -Execute to delete expired resource groups." -ForegroundColor Yellow
}
```

## Cost-Based Cleanup

Sometimes you want to clean up based on cost rather than age. This script identifies resource groups with significant spending but no recent tags indicating they are needed.

```powershell
# Clean-CostlyIdleResources.ps1
# Identifies resource groups with high cost but low utilization

[CmdletBinding()]
param(
    [decimal]$MinMonthlyCost = 50,
    [string]$SubscriptionId
)

if ($SubscriptionId) {
    Set-AzContext -SubscriptionId $SubscriptionId | Out-Null
}

Write-Host "Analyzing resource group costs..." -ForegroundColor Cyan

# Get all resource groups without production tags
$candidates = Get-AzResourceGroup | Where-Object {
    -not ($_.Tags -and $_.Tags.ContainsKey("environment") -and
          $_.Tags["environment"] -in @("production", "prod"))
}

$costlyGroups = @()

foreach ($rg in $candidates) {
    # Get cost for the last 30 days using the Cost Management API
    $endDate = (Get-Date).ToString("yyyy-MM-dd")
    $startDate = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")

    try {
        # Use the consumption API to get costs
        $usage = Get-AzConsumptionUsageDetail `
            -StartDate $startDate `
            -EndDate $endDate `
            -ResourceGroup $rg.ResourceGroupName `
            -WarningAction SilentlyContinue

        $totalCost = ($usage | Measure-Object -Property PretaxCost -Sum).Sum

        if ($totalCost -ge $MinMonthlyCost) {
            $costlyGroups += [PSCustomObject]@{
                ResourceGroupName = $rg.ResourceGroupName
                MonthlyCost       = [Math]::Round($totalCost, 2)
                ResourceCount     = (Get-AzResource -ResourceGroupName $rg.ResourceGroupName).Count
                Owner             = if ($rg.Tags -and $rg.Tags.ContainsKey("owner")) { $rg.Tags["owner"] } else { "unknown" }
                Environment       = if ($rg.Tags -and $rg.Tags.ContainsKey("environment")) { $rg.Tags["environment"] } else { "untagged" }
            }
        }
    }
    catch {
        # Skip if cost data is unavailable
        Write-Verbose "Could not get cost data for $($rg.ResourceGroupName)"
    }
}

# Sort by cost descending
$costlyGroups = $costlyGroups | Sort-Object MonthlyCost -Descending

Write-Host "`nNon-production resource groups costing more than `$$MinMonthlyCost/month:" -ForegroundColor Yellow
$costlyGroups | Format-Table -AutoSize

$totalWaste = ($costlyGroups | Measure-Object -Property MonthlyCost -Sum).Sum
Write-Host "Total potential monthly savings: `$$([Math]::Round($totalWaste, 2))" -ForegroundColor Red
```

## Scheduling Cleanup with Azure Automation

Run these scripts automatically using Azure Automation runbooks.

```powershell
# Setup-AutomationSchedule.ps1
# Creates an Azure Automation account and schedules the cleanup runbook

$rgName = "rg-automation"
$automationAccount = "aa-resource-cleanup"
$location = "eastus"

# Create automation account
New-AzAutomationAccount -ResourceGroupName $rgName `
    -Name $automationAccount `
    -Location $location

# Import the cleanup script as a runbook
Import-AzAutomationRunbook -ResourceGroupName $rgName `
    -AutomationAccountName $automationAccount `
    -Path "./Clean-ExpiredResourceGroups.ps1" `
    -Name "Clean-Expired-Resources" `
    -Type PowerShell `
    -Published

# Create a weekly schedule
New-AzAutomationSchedule -ResourceGroupName $rgName `
    -AutomationAccountName $automationAccount `
    -Name "Weekly-Cleanup" `
    -StartTime (Get-Date).AddDays(1).Date.AddHours(2) `
    -WeekInterval 1 `
    -DaysOfWeek "Sunday" `
    -TimeZone "Eastern Standard Time"

# Link the schedule to the runbook
Register-AzAutomationScheduledRunbook -ResourceGroupName $rgName `
    -AutomationAccountName $automationAccount `
    -RunbookName "Clean-Expired-Resources" `
    -ScheduleName "Weekly-Cleanup" `
    -Parameters @{ Execute = $true }
```

## Best Practices

A few things I have found essential for production cleanup automation. Always start with dry runs. Run the scripts in report-only mode for at least two weeks before enabling deletion. Review the reports and verify that nothing important would be deleted.

Use multiple protection layers. Naming conventions, tags, and resource locks should all work together. A resource group named `rg-prod-api` with a `persistent` tag and a CanNotDelete lock has three layers of protection against accidental cleanup.

Send notifications before deletion. Give resource owners 48 hours notice that their resources will be cleaned up. This catches the cases where someone still needs something but forgot to tag it properly.

Keep audit logs. Every deletion should be logged with the resource group name, who or what triggered it, and when it happened. This makes it easy to diagnose if something was accidentally deleted.

Start conservative. Set long thresholds initially (30 days instead of 7) and tighten them as your team gets comfortable with the process.

Automated resource cleanup is one of those investments that pays for itself within the first month. The PowerShell scripts here give you a solid starting point that you can adapt to your organization's specific policies and conventions.
