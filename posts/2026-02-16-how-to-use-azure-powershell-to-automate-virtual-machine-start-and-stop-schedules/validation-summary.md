# Validation Summary: How to Use Azure PowerShell to Automate Virtual Machine Start and Stop Schedules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure PowerShell
- Azure Virtual Machines
- Azure Automation runbooks and schedules
- Azure managed identities
- Azure role-based access control
- Azure DevTestLab VM auto-shutdown schedules

## Sources Consulted
- Microsoft Learn: Stop-AzVM (Az.Compute) - https://learn.microsoft.com/en-us/powershell/module/az.compute/stop-azvm
- Microsoft Learn: States and billing status of Azure Virtual Machines - https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing
- Microsoft Learn: Using a system-assigned managed identity for an Azure Automation account - https://learn.microsoft.com/en-us/azure/automation/enable-managed-identity-for-automation
- Microsoft Learn: Create Automation PowerShell runbook using managed identity - https://learn.microsoft.com/en-us/azure/automation/learn/powershell-runbook-managed-identity
- Microsoft Learn: New-AzAutomationAccount (Az.Automation) - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationaccount
- Microsoft Learn: New-AzAutomationRunbook (Az.Automation) - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationrunbook
- Microsoft Learn: Import-AzAutomationRunbook (Az.Automation) - https://learn.microsoft.com/en-us/powershell/module/az.automation/import-azautomationrunbook
- Microsoft Learn: New-AzAutomationSchedule (Az.Automation) - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationschedule
- Microsoft Learn: Register-AzAutomationScheduledRunbook (Az.Automation) - https://learn.microsoft.com/en-us/powershell/module/az.automation/register-azautomationscheduledrunbook
- Microsoft Learn: Update-AzVM (Az.Compute) - https://learn.microsoft.com/en-us/powershell/module/az.compute/update-azvm
- Microsoft Learn: New-AzResource (Az.Resources) - https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azresource
- Microsoft Learn: Microsoft.DevTestLab/schedules template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.devtestlab/schedules

## Issues Found
- Corrected the VM state label from `Stopped (StoppedDeallocated)` to `Stopped (deallocated)`, matching Azure's documented display terminology for deallocated VMs.
- Updated the basic stop and start scripts to authenticate with the Azure Automation account's system-assigned managed identity using `Disable-AzContextAutosave`, `Connect-AzAccount -Identity`, and `Set-AzContext`. The original stop script stated authentication was not needed in Azure Automation, which is inaccurate for managed-identity runbooks.
- Made the VM tagging example handle VMs with no existing tags by initializing an empty hashtable before assigning tag values.
- Changed runbook creation and import examples from `PowerShell` to `PowerShell72`, which is a current accepted Azure Automation runbook type for PowerShell 7.2 scripts.
- Added an explicit `-ApiVersion "2018-09-15"` to the `New-AzResource` example for the `Microsoft.DevTestLab/schedules` resource, matching the documented resource type version.

## Review Notes
PowerShell was not available in the local workspace, so snippets were reviewed statically and checked against Microsoft Learn documentation rather than executed. The pricing examples remain approximate and should be refreshed against the Azure Retail Prices API or Azure Pricing Calculator before publication if exact savings are required.
