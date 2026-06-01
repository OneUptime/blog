# Validation Summary: How to Create Azure PowerShell Runbooks for Automated Infrastructure Maintenance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Automation
- Azure PowerShell Az modules
- PowerShell runbooks
- Azure managed identities
- Azure RBAC
- Azure virtual machines
- Azure managed disks and snapshots
- Azure resource tags

## Sources Consulted
- Microsoft Learn: Using a system-assigned managed identity for an Azure Automation account - https://learn.microsoft.com/en-us/azure/automation/enable-managed-identity-for-automation
- Microsoft Learn: Manage runbooks in Azure Automation - https://learn.microsoft.com/en-us/azure/automation/manage-runbooks
- Microsoft Learn: New-AzAutomationAccount - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationaccount
- Microsoft Learn: New-AzResourceGroup - https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azresourcegroup
- Microsoft Learn: New-AzRoleAssignment - https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azroleassignment
- Microsoft Learn: Import-AzAutomationRunbook - https://learn.microsoft.com/en-us/powershell/module/az.automation/import-azautomationrunbook
- Microsoft Learn: New-AzAutomationSchedule - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationschedule
- Microsoft Learn: Register-AzAutomationScheduledRunbook - https://learn.microsoft.com/en-us/powershell/module/az.automation/register-azautomationscheduledrunbook
- Microsoft Learn: Get-AzDisk and Remove-AzDisk - https://learn.microsoft.com/en-us/powershell/module/az.compute/get-azdisk and https://learn.microsoft.com/en-us/powershell/module/az.compute/remove-azdisk
- Microsoft Learn: Get-AzVM, Stop-AzVM, and Start-AzVM - https://learn.microsoft.com/en-us/powershell/module/az.compute/get-azvm, https://learn.microsoft.com/en-us/powershell/module/az.compute/stop-azvm, and https://learn.microsoft.com/en-us/powershell/module/az.compute/start-azvm
- Microsoft Learn: Get-AzSnapshot and Remove-AzSnapshot - https://learn.microsoft.com/en-us/powershell/module/az.compute/get-azsnapshot and https://learn.microsoft.com/en-us/powershell/module/az.compute/remove-azsnapshot
- Microsoft Learn: Get-AzResource - https://learn.microsoft.com/en-us/powershell/module/az.resources/get-azresource
- Microsoft Learn: Manage variables in Azure Automation - https://learn.microsoft.com/en-us/azure/automation/shared-resources/variables

## Issues Found
- The setup snippet created an Automation Account in `rg-automation` without first creating the resource group. Added `New-AzResourceGroup` so the portal-free setup works from a clean subscription.
- The runbook examples authenticated with `Connect-AzAccount -Identity` but did not disable inherited Az context or set the managed identity context for the current job. Added `Disable-AzContextAutosave -Scope Process` and `Set-AzContext`, matching Microsoft guidance for Azure Automation managed identity runbooks.
- Several examples called `.ContainsKey()` or indexed tags without checking whether `Tags` was null. Added null guards for disks, VMs, and snapshots so untagged resources do not fail the runbook.
- The notification example used `$env:ALERT_WEBHOOK_URL`, which is not the standard way to persist shared values in Azure Automation runbooks. Changed it to read an Automation variable with `Get-AutomationVariable`.

## Review Notes
The examples are intentionally broad and use Contributor at subscription scope for simplicity. For production use, the post already notes that specific resource group scopes are preferable for least privilege.
