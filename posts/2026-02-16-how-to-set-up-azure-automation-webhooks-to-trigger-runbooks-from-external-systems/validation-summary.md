# Validation Summary: Set Up Azure Automation Webhooks to Trigger Runbooks from External Systems

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Automation
- Azure Automation runbooks
- Azure Automation webhooks
- Azure CLI
- Azure PowerShell
- PowerShell runbooks
- Azure managed identities
- Azure role assignments
- GitHub Actions
- Python requests
- curl

## Sources Consulted
- Microsoft Learn: Start a runbook from a webhook - https://learn.microsoft.com/en-us/azure/automation/automation-webhooks
- Microsoft Learn: Azure Automation account authentication overview - https://learn.microsoft.com/en-us/azure/automation/automation-security-overview
- Microsoft Learn: Azure Automation managed identity - https://learn.microsoft.com/en-us/azure/automation/enable-managed-identity-for-automation
- Microsoft Learn: Azure CLI az automation account reference - https://learn.microsoft.com/en-us/cli/azure/automation/account
- Microsoft Learn: Azure CLI az automation runbook reference - https://learn.microsoft.com/en-us/cli/azure/automation/runbook
- Microsoft Learn: Azure CLI az automation job reference - https://learn.microsoft.com/en-us/cli/azure/automation/job
- Microsoft Learn: New-AzAutomationWebhook reference - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationwebhook
- Microsoft Learn: Set-AzAutomationAccount reference - https://learn.microsoft.com/en-us/powershell/module/az.automation/set-azautomationaccount
- Microsoft Learn: Get-AzAutomationJobOutput reference - https://learn.microsoft.com/en-us/powershell/module/az.automation/get-azautomationjoboutput
- Microsoft Learn: Start-AzVM reference - https://learn.microsoft.com/en-us/powershell/module/az.compute/start-azvm
- Microsoft Learn: Stop-AzVM reference - https://learn.microsoft.com/en-us/powershell/module/az.compute/stop-azvm
- Microsoft Learn: Restart-AzVM reference - https://learn.microsoft.com/en-us/powershell/module/az.compute/restart-azvm

## Issues Found
- The post used `az automation webhook create`, but the current official Azure CLI Automation reference does not expose a webhook command group. Replaced the webhook creation snippet with the official `New-AzAutomationWebhook` Azure PowerShell cmdlet.
- The webhook expiry timestamp was `2025-12-31T23:59:59Z`, which is already expired for this 2026-dated post. Updated it to `2027-12-31T23:59:59Z`.
- The runbook authenticated with `Connect-AzAccount -Identity`, but the setup did not enable a managed identity or assign VM permissions. Added a minimal Azure PowerShell setup snippet to enable the system-assigned identity and grant `Virtual Machine Contributor` on the target resource group.
- The runbook examples passed `-Force` to `Start-AzVM` and `Restart-AzVM`, but those cmdlets do not support that parameter in the current official Az.Compute documentation. Removed `-Force` from those calls and kept it for `Stop-AzVM`, where it is valid.
- The post used `az automation job show-output`, but the current official Azure CLI Automation job reference does not include that command. Replaced it with the official `Get-AzAutomationJobOutput` Azure PowerShell cmdlet.

## Review Notes
The remaining examples are technically plausible. The `curl`, GitHub Actions, and Python snippets correctly use POST requests with JSON bodies, and the `$WebhookData` usage aligns with Azure Automation webhook behavior. In production, the runbook should also handle malformed or missing JSON fields more defensively before acting on Azure resources.
