# Validation Summary: How to Troubleshoot Failed Azure Automation Runbook Jobs

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Automation
- Azure Automation runbooks
- Azure Automation Hybrid Runbook Worker
- Azure managed identities
- Azure CLI
- Azure PowerShell Az modules
- PowerShell runbooks
- Azure Monitor metric alerts
- Azure RBAC

## Sources Consulted
- Microsoft Learn: Configure runbook output and message streams - https://learn.microsoft.com/en-us/azure/automation/automation-runbook-output-and-messages
- Microsoft Learn: Runbook execution in Azure Automation - https://learn.microsoft.com/en-us/azure/automation/automation-runbook-execution
- Microsoft Learn: Troubleshoot runbook issues - https://learn.microsoft.com/en-us/azure/automation/troubleshoot/runbooks
- Microsoft Learn: Azure Automation Hybrid Runbook Worker overview - https://learn.microsoft.com/en-us/azure/automation/automation-hybrid-runbook-worker
- Microsoft Learn: Using a system-assigned managed identity for an Azure Automation account - https://learn.microsoft.com/en-us/azure/automation/enable-managed-identity-for-automation
- Microsoft Learn: Manage modules in Azure Automation - https://learn.microsoft.com/en-us/azure/automation/shared-resources/modules
- Microsoft Learn: az automation job CLI reference - https://learn.microsoft.com/en-us/cli/azure/automation/job
- Microsoft Learn: az automation account CLI reference - https://learn.microsoft.com/en-us/cli/azure/automation/account
- Microsoft Learn: az monitor metrics alert CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Supported metrics for Microsoft.Automation/automationAccounts - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-automation-automationaccounts-metrics

## Issues Found
- The progress stream description implied progress data is always collected. Updated it to note that progress records are written only when progress logging is enabled.
- The managed identity fix used `az automation account update --assign-identity`, but the current Azure CLI Automation account reference does not list that parameter. Replaced it with the documented `Set-AzAutomationAccount -AssignSystemIdentity` PowerShell command.
- The module import example used an Azure CLI command/parameter that could not be verified in the current official CLI reference. Replaced it with the documented `New-AzAutomationModule -ContentLinkUri` PowerShell example and added the required module version placeholder.
- The timeout/fair-share section described 3-hour jobs as paused/resumed and used an inaccurate evicted-job message. Updated it to match Microsoft guidance: Azure sandbox jobs that exceed the fair-share limit are stopped or failed depending on runbook type, and the documented message says the job reached a Stopped state.
- The metric alert command used `--action-group`, which is not the current Azure CLI parameter for metric alerts. Replaced it with `--action` and added the `Status includes Failed` dimension filter so the alert targets failed runbook jobs rather than all jobs.

## Review Notes
The `az automation` command group is currently documented as an Azure CLI extension and experimental. The post's job-list examples are still technically valid against the current reference, but future readers should be aware that experimental CLI behavior can change.
