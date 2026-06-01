# Validation Summary: How to Automatically Start and Stop Azure VMs on a Schedule

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Machines
- Azure Automation
- Azure Automation schedules
- Azure PowerShell Az modules
- Azure CLI
- Managed identities
- Azure Monitor alerts
- DevTest Labs VM auto-shutdown schedules

## Sources Consulted
- Microsoft Learn: Manage schedules in Azure Automation - https://learn.microsoft.com/en-us/azure/automation/shared-resources/schedules
- Microsoft Learn: az automation schedule CLI reference - https://learn.microsoft.com/en-us/cli/azure/automation/schedule
- Microsoft Learn: az vm CLI reference - https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: Stop-AzVM PowerShell reference - https://learn.microsoft.com/en-us/powershell/module/az.compute/stop-azvm
- Microsoft Learn: Start-AzVM PowerShell reference - https://learn.microsoft.com/en-us/powershell/module/az.compute/start-azvm
- Microsoft Learn: Using a system-assigned managed identity for an Azure Automation account - https://learn.microsoft.com/en-us/azure/automation/enable-managed-identity-for-automation
- Microsoft Learn: Start/Stop VMs v2 overview - https://learn.microsoft.com/en-us/azure/azure-functions/start-stop-v2/overview
- Microsoft Learn: Deploy Start/Stop VMs v2 to an Azure subscription - https://learn.microsoft.com/en-us/azure/azure-functions/start-stop-v2/deploy

## Issues Found
- The Azure CLI `az automation schedule create` example was described as creating Monday-Friday schedules, but the CLI command does not expose a day-of-week option. Replaced the schedule creation snippet with `New-AzAutomationSchedule` using `-WeekInterval` and `-DaysOfWeek`, matching the Azure Automation schedule documentation.
- The simple stop runbook comment said `-NoWait` was used for parallel stop, but the command did not include `-NoWait`. Updated the comment to describe only the actual `-Force` behavior.
- The tag convention implied `ShutdownTime` and `StartTime` were used by the shown tag-based runbooks, but the scripts only filter on `AutoShutdown=true`. Clarified those tags as documentation or future fine-grained logic.
- The `az vm auto-shutdown` command used `--timezone`, which is not a supported option in the current Azure CLI reference. Removed `--timezone`, changed the example time to UTC, and noted that CLI `--time` is specified in UTC.
- The savings estimate said a 7 PM to 7 AM weekday shutdown plus all weekend means roughly 76% off time and $152 savings on a $200/month VM. That schedule is about 64% off time, so the estimate was corrected to about $128/month.

## Review Notes
The runbook examples assume the Automation account managed identity has been enabled and granted sufficient Azure RBAC permissions, such as permissions to read, start, and stop/deallocate target VMs. The post now validates technically, but a future improvement could add explicit setup steps for the Automation account identity and module prerequisites.
