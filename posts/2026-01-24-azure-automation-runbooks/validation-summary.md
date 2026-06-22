# Validation Summary: How to Handle Azure Automation Runbooks

## Status
validated

## Post Type
Tutorial / hands-on guide

## Technologies Covered
- Azure Automation
- Azure Automation runbooks
- Azure CLI automation extension
- Azure PowerShell Az.Automation cmdlets
- Azure PowerShell Az.Compute cmdlets
- Azure managed identities
- PowerShell runbooks
- Python runbooks
- Azure SDK for Python
- Automation schedules and webhooks

## Sources Consulted
- Microsoft Learn: Azure CLI `az automation` reference - https://learn.microsoft.com/en-us/cli/azure/automation?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az automation runbook` reference - https://learn.microsoft.com/en-us/cli/azure/automation/runbook?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az automation schedule` reference - https://learn.microsoft.com/en-us/cli/azure/automation/schedule?view=azure-cli-latest
- Microsoft Learn: Azure Automation runbook types - https://learn.microsoft.com/en-us/azure/automation/automation-runbook-types
- Microsoft Learn: Start an Azure Automation runbook from a webhook - https://learn.microsoft.com/en-us/azure/automation/automation-webhooks
- Microsoft Learn: Manage Python 3 packages in Azure Automation - https://learn.microsoft.com/en-us/azure/automation/python-3-packages
- Microsoft Learn: Create a Python 3.8 runbook in Azure Automation - https://learn.microsoft.com/en-us/azure/automation/learn/automation-tutorial-runbook-textual-python-3
- Microsoft Learn: Manage modules in Azure Automation - https://learn.microsoft.com/en-us/azure/automation/shared-resources/modules
- Microsoft Learn: Manage variables in Azure Automation - https://learn.microsoft.com/en-us/azure/automation/shared-resources/variables
- Microsoft Learn: `New-AzAutomationSchedule` - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationschedule?view=azps-16.0.0
- Microsoft Learn: `Register-AzAutomationScheduledRunbook` - https://learn.microsoft.com/en-us/powershell/module/az.automation/register-azautomationscheduledrunbook?view=azps-16.0.0
- Microsoft Learn: `New-AzAutomationWebhook` - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationwebhook?view=azps-16.0.0
- Microsoft Learn: `Get-AzAutomationJobOutput` - https://learn.microsoft.com/en-us/powershell/module/az.automation/get-azautomationjoboutput?view=azps-16.0.0
- Microsoft Learn: `New-AzAutomationModule` - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationmodule?view=azps-16.0.0

## Issues Found
- Fixed the PowerShell VM tag filter to guard against VMs with no tags. Indexing a null `Tags` collection can fail, so the filter now checks `$_.Tags` before reading a tag value.
- Fixed the Python disk cleanup runbook so `DiskCleanup_RetentionDays` is actually enforced. The original script printed the retention setting but deleted every unattached disk regardless of age.
- Fixed Python Automation variable parsing for boolean and integer values. Automation variables can be returned as strings, so the dry-run setting now parses common true values instead of treating any non-empty string as truthy.
- Fixed the Python deletion flow to wait for `begin_delete()` to complete before printing that a disk was successfully deleted.
- Replaced unsupported current Azure CLI examples for scheduled runbook linking, webhook creation, job output retrieval, and module import with supported Az.Automation PowerShell cmdlets.
- Fixed the weekday schedule example. The original CLI schedule created a weekly recurrence but did not select Monday-Friday. The PowerShell example now uses `-DaysOfWeek`.
- Updated the schedule start date to a future weekday relative to the validation date so the example remains valid.
- Fixed the webhook trigger example. A webhook call body is delivered through `WebhookData`; it does not override the fixed runbook parameters configured on the webhook. The example now sends an empty JSON object for a webhook that already has fixed parameters.

## Review Notes
- The Azure CLI Automation command group is provided by the `automation` extension and is marked experimental in current Microsoft documentation for several runbook/job commands.
- The Python sample assumes required Python packages such as `azure-identity`, `azure-mgmt-compute`, and `azure-mgmt-resource` are available in the selected Automation runtime environment.
- The broad subscription-wide role assignment example works, but production environments should usually scope permissions more narrowly than subscription Contributor.
