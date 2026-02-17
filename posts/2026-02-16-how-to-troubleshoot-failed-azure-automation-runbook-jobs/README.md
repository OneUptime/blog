# How to Troubleshoot Failed Azure Automation Runbook Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Automation, Troubleshooting, Runbook, PowerShell, Debugging, Operations

Description: A practical troubleshooting guide for diagnosing and fixing failed Azure Automation runbook jobs with real-world examples and solutions.

---

You set up your Azure Automation runbook, tested it, scheduled it, and walked away feeling good about your automation. Then you check back a few days later and find a string of failed jobs with cryptic error messages. Runbook failures are frustrating because they often happen silently, and the error messages from Azure Automation do not always point you to the root cause.

In this post, I will walk through the most common reasons runbook jobs fail, how to diagnose each one, and practical fixes for each scenario.

## Where to Find Job Failure Information

Before diving into specific failures, let me cover where to look for diagnostic information.

### Job Output and Streams

Every runbook job produces several output streams:

- **Output** - what your script sends to `Write-Output`
- **Error** - errors captured by `Write-Error` or thrown exceptions
- **Warning** - warnings from `Write-Warning`
- **Verbose** - verbose output from `Write-Verbose` (only if verbose logging is enabled)
- **Progress** - progress bar data

In the portal, go to your Automation account, click "Jobs" under Process Automation, click on the failed job, and then check each stream tab.

### Activity Log

Automation job events also appear in the Azure Activity Log:

```bash
# Find failed automation jobs in the activity log
az monitor activity-log list \
  --offset 7d \
  --query "[?contains(resourceType.value, 'Microsoft.Automation') && status.value=='Failed'].{operation:operationName.localizedValue, time:eventTimestamp, status:status.value}" \
  --output table
```

### Job Details via CLI

```bash
# List recent failed jobs
az automation job list \
  --resource-group rg-automation \
  --automation-account-name aa-operations \
  --query "[?status=='Failed'].{name:runbook.name, status:status, startTime:startTime, endTime:endTime}" \
  --output table
```

## Common Failure: Authentication Errors

This is the most frequent failure I see. The runbook cannot authenticate to Azure.

### Symptom

The error stream shows something like:
```
Connect-AzAccount : No MSI found for the specified ClientId/ResourceId
```
or
```
Connect-AzAccount : ManagedIdentityCredential authentication unavailable
```

### Diagnosis

Check whether the managed identity is enabled and has the right permissions:

```bash
# Verify the managed identity exists
az automation account show \
  --resource-group rg-automation \
  --name aa-operations \
  --query "identity"

# Check role assignments for the managed identity
PRINCIPAL_ID=$(az automation account show \
  --resource-group rg-automation \
  --name aa-operations \
  --query "identity.principalId" -o tsv)

az role assignment list \
  --assignee "$PRINCIPAL_ID" \
  --output table
```

### Fixes

- If the identity is missing, enable it: `az automation account update --resource-group rg-automation --name aa-operations --assign-identity`
- If the identity exists but lacks permissions, add the appropriate role assignment
- If you recently enabled the identity, wait a few minutes for Azure AD propagation
- Make sure the runbook is using `Connect-AzAccount -Identity`, not the deprecated `AzureRunAsConnection`

## Common Failure: Module Not Found

### Symptom

```
The term 'Get-AzVM' is not recognized as the name of a cmdlet
```
or
```
Import-Module : The specified module 'Az.Compute' was not loaded
```

### Diagnosis

Check which modules are installed in the Automation account:

```bash
# List installed modules and their versions
az automation module list \
  --resource-group rg-automation \
  --automation-account-name aa-operations \
  --query "[].{name:name, version:version, provisioningState:provisioningState}" \
  --output table
```

### Fixes

Import the missing module:

```bash
# Import the Az.Compute module from the PowerShell Gallery
az automation module create \
  --resource-group rg-automation \
  --automation-account-name aa-operations \
  --name Az.Compute \
  --content-link "https://www.powershellgallery.com/api/v2/package/Az.Compute"
```

Important notes:
- Modules have dependencies. Az.Compute depends on Az.Accounts, so install Az.Accounts first.
- Module installation takes a few minutes. Check the provisioning state before running your runbook.
- If you are using PowerShell 7.2 runtime, make sure the modules are compatible with that version.

## Common Failure: Job Suspended or Timed Out

### Symptom

The job status shows "Suspended" or the job ran for the maximum duration (3 hours by default) and was terminated.

### Diagnosis

Check the job output to see where it got stuck. Often the script is waiting for user input (which will never come in an automation context) or is running an infinite loop.

### Fixes

- **Waiting for input:** Make sure you use `-Force` or `-Confirm:$false` on any cmdlet that might prompt for confirmation. Common culprits: `Remove-AzResource`, `Stop-AzVM`, `Remove-Item`.

```powershell
# Bad - will suspend waiting for confirmation
Remove-AzResourceGroup -Name "old-rg"

# Good - skips confirmation prompt
Remove-AzResourceGroup -Name "old-rg" -Force
```

- **Long-running operations:** If your script legitimately needs more than 3 hours, use child runbooks to break the work into smaller pieces. Each child runbook gets its own 3-hour window.

- **Infinite loops:** Add timeout logic to any loop that waits for a condition:

```powershell
# Bad - infinite loop if condition is never met
while ($status -ne "Ready") {
    Start-Sleep -Seconds 30
    $status = Get-Something
}

# Good - loop with a timeout
$maxWaitMinutes = 30
$startTime = Get-Date
while ($status -ne "Ready") {
    if ((Get-Date) -gt $startTime.AddMinutes($maxWaitMinutes)) {
        Write-Error "Timed out waiting for status to become Ready after $maxWaitMinutes minutes"
        throw "Timeout exceeded"
    }
    Start-Sleep -Seconds 30
    $status = Get-Something
}
```

## Common Failure: Quota and Fair Share Limits

### Symptom

The job fails with a message about exceeding the fair share limit, or you see:

```
The job was evicted and subsequently resumed. This is common for long-running jobs.
```

### Diagnosis

Azure Automation enforces a "fair share" policy where jobs in the Azure sandbox are paused after 3 hours and may be reassigned to a different sandbox. This can cause issues with jobs that maintain state in memory.

### Fixes

- **Use checkpoints:** For long-running workflows, use PowerShell Workflow runbooks with `Checkpoint-Workflow` to save state periodically.

- **Use Hybrid Workers:** Jobs running on Hybrid Runbook Workers are not subject to the fair share limit.

- **Break up large jobs:** Split your work across multiple shorter runbooks.

## Common Failure: Resource Group or Resource Not Found

### Symptom

```
Resource group 'rg-dev-old' could not be found
```
or
```
The Resource 'Microsoft.Compute/virtualMachines/myvm' was not found
```

### Diagnosis

The resource was deleted, renamed, or moved since the runbook was written. This is especially common with scheduled runbooks that target specific resources by name.

### Fixes

- **Use tags instead of resource names:** Instead of hard-coding `Get-AzVM -Name "myvm"`, use `Get-AzResource -Tag @{ManagedBy="automation"}`.
- **Add existence checks:**

```powershell
# Check if the resource exists before operating on it
$vm = Get-AzVM -ResourceGroupName "rg-dev" -Name "myvm" -ErrorAction SilentlyContinue
if ($null -eq $vm) {
    Write-Warning "VM 'myvm' not found in 'rg-dev' - it may have been deleted"
    return
}

# Proceed with operations on the VM
Stop-AzVM -ResourceGroupName "rg-dev" -Name $vm.Name -Force
```

## Common Failure: Insufficient Permissions

### Symptom

```
Authorization failed for the request. The client does not have authorization to perform action 'Microsoft.Compute/virtualMachines/deallocate/action'
```

### Diagnosis

The managed identity does not have the required RBAC role for the operation the runbook is trying to perform.

### Fixes

Add the specific role needed:

```bash
# Check what roles the identity currently has
az role assignment list --assignee "$PRINCIPAL_ID" --output table

# Add the missing role - use the most specific role possible
az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Virtual Machine Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-dev"
```

## Building a Robust Error Handling Pattern

To make your runbooks more resilient and easier to debug, use this pattern:

```powershell
# Runbook: Robust-Example
# Purpose: Demonstrate error handling best practices

# Stop on all errors so they get caught by try/catch
$ErrorActionPreference = "Stop"

try {
    # Authenticate first - fail fast if this doesn't work
    Write-Output "Authenticating with managed identity..."
    Connect-AzAccount -Identity | Out-Null
    Write-Output "Authentication successful"

    # Main logic wrapped in try/catch
    Write-Output "Starting main operations..."

    $vms = Get-AzVM -ResourceGroupName "rg-dev"
    Write-Output "Found $($vms.Count) VMs"

    foreach ($vm in $vms) {
        try {
            Write-Output "Processing VM: $($vm.Name)"
            # Per-item operations here
            Stop-AzVM -ResourceGroupName $vm.ResourceGroupName -Name $vm.Name -Force
            Write-Output "  Successfully stopped $($vm.Name)"
        }
        catch {
            # Log the error but continue with other VMs
            Write-Warning "Failed to stop $($vm.Name): $($_.Exception.Message)"
        }
    }

    Write-Output "All operations completed"
}
catch {
    # Catch fatal errors (authentication failure, etc.)
    Write-Error "Runbook failed: $($_.Exception.Message)"
    Write-Error "Stack trace: $($_.ScriptStackTrace)"
    throw  # Re-throw so the job shows as Failed
}
```

Key elements of this pattern:
- `$ErrorActionPreference = "Stop"` turns all errors into terminating errors
- Outer try/catch handles fatal errors like authentication failures
- Inner try/catch handles per-item errors without stopping the entire runbook
- `Write-Output` for progress tracking (appears in the Output stream)
- `Write-Warning` for non-fatal issues (appears in the Warning stream)
- `Write-Error` for errors (appears in the Error stream)
- Re-throwing the exception ensures the job status reflects the failure

## Setting Up Failure Alerts

Do not rely on manually checking job status. Set up alerts:

```bash
# Create an alert that fires when any runbook job fails
az monitor metrics alert create \
  --resource-group rg-automation \
  --name "RunbookJobFailure" \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-automation/providers/Microsoft.Automation/automationAccounts/aa-operations" \
  --condition "total TotalJob > 0" \
  --description "Alert when automation jobs fail" \
  --action-group "/subscriptions/<sub-id>/resourceGroups/rg-monitoring/providers/Microsoft.Insights/actionGroups/ag-ops-team" \
  --evaluation-frequency 5m \
  --window-size 5m
```

## Wrapping Up

Runbook failures are inevitable in any automation system. The key is to find them quickly (alerts), diagnose them efficiently (streams and logs), and fix them systematically (the common failure patterns above). Build error handling into your runbooks from the start, use tags for resource discovery instead of hard-coded names, and always test authentication before deploying. When failures do happen, the structured troubleshooting approach in this post should help you resolve them faster.
