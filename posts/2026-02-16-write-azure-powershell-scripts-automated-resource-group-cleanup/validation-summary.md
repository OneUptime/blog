# Validation Summary: How to Write Azure PowerShell Scripts for Automated Resource Group Cleanup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure PowerShell
- Azure Resource Manager resource groups
- Azure Activity Log
- Azure Cost Management and Consumption usage details
- Azure Automation runbooks and schedules
- Azure managed identities
- Azure RBAC

## Sources Consulted
- Microsoft Learn: Get-AzResourceGroup - https://learn.microsoft.com/en-us/powershell/module/az.resources/get-azresourcegroup
- Microsoft Learn: Remove-AzResourceGroup - https://learn.microsoft.com/en-us/powershell/module/az.resources/remove-azresourcegroup
- Microsoft Learn: Get-AzResource - https://learn.microsoft.com/en-us/powershell/module/az.resources/get-azresource
- Microsoft Learn: Get-AzActivityLog - https://learn.microsoft.com/en-us/powershell/module/az.monitor/get-azactivitylog
- Microsoft Learn: Get-AzConsumptionUsageDetail - https://learn.microsoft.com/en-us/powershell/module/az.billing/get-azconsumptionusagedetail
- Microsoft Learn: New-AzResourceGroup - https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azresourcegroup
- Microsoft Learn: New-AzAutomationAccount - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationaccount
- Microsoft Learn: Import-AzAutomationRunbook - https://learn.microsoft.com/en-us/powershell/module/az.automation/import-azautomationrunbook
- Microsoft Learn: New-AzAutomationSchedule - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationschedule
- Microsoft Learn: Register-AzAutomationScheduledRunbook - https://learn.microsoft.com/en-us/powershell/module/az.automation/register-azautomationscheduledrunbook
- Microsoft Learn: New-AzRoleAssignment - https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azroleassignment
- Microsoft Learn: Using a system-assigned managed identity for an Azure Automation account - https://learn.microsoft.com/en-us/azure/automation/enable-managed-identity-for-automation
- Microsoft Learn: about_Functions_CmdletBindingAttribute - https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions_cmdletbindingattribute

## Issues Found
- The Azure Automation scheduling example created and scheduled a runbook without giving it a non-interactive authentication path. I updated the cleanup scripts to accept `-UseManagedIdentity`, added `Connect-AzAccount -Identity` handling for runbook execution, created the Automation account with `-AssignSystemIdentity`, assigned the managed identity the Contributor role at subscription scope, and passed `UseManagedIdentity = $true` in the schedule parameters.
- The setup script assumed the `rg-automation` resource group already existed. I added `New-AzResourceGroup -Force` before creating the Automation account.
- The stale resource group script used `Get-AzActivityLog -MaxRecord 1` before filtering for `resourceGroups/write`, which could miss the creation event if the latest activity log entry was unrelated. I changed the activity log query to retrieve up to 1000 records, filter for resource group write operations, and sort by `EventTimestamp`.
- The stale resource group script described its age check as looking at earliest resource creation, but the code actually uses resource group activity. I corrected the comment to avoid a misleading technical claim.

## Review Notes
The PowerShell cmdlets and parameters used in the corrected examples are current in the referenced Microsoft Learn documentation. Activity Log lookups are still limited by Azure Activity Log retention, so resource groups with no creation event in the retained window are treated conservatively as unknown/old by the sample script.
