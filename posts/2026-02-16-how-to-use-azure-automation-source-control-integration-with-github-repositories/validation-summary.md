# Validation Summary: How to Use Azure Automation Source Control Integration with GitHub Repositories

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Automation
- Azure Automation source control integration
- GitHub repositories and personal access tokens
- Azure CLI
- Azure PowerShell Az.Automation
- PowerShell runbooks
- GitHub Actions
- PSScriptAnalyzer

## Sources Consulted
- Microsoft Learn: Use source control integration in Azure Automation - https://learn.microsoft.com/en-us/azure/automation/source-control-integration
- Microsoft Learn: Azure CLI `az automation source-control` reference - https://learn.microsoft.com/en-us/cli/azure/automation/source-control
- Microsoft Learn: Azure CLI `az automation source-control sync-job` reference - https://learn.microsoft.com/en-us/cli/azure/automation/source-control/sync-job
- Microsoft Learn: Manage modules in Azure Automation - https://learn.microsoft.com/en-us/azure/automation/shared-resources/modules
- Microsoft Learn: `New-AzAutomationModule` reference - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationmodule
- Microsoft Learn: `Microsoft.Automation/automationAccounts/modules` ARM/Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.automation/2023-11-01/automationaccounts/modules
- Microsoft Learn: PowerShell `PSParser.Tokenize` reference - https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.psparser.tokenize
- GitHub Docs: Fine-grained personal access token permissions - https://docs.github.com/en/rest/overview/permissions-required-for-fine-grained-personal-access-tokens
- Microsoft Learn: Authenticate to Azure from GitHub Actions by a secret - https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-secret

## Issues Found
- The post described Azure Automation source control as "one-way or two-way sync." Microsoft documents source control integration as single-direction synchronization from the source repository to the Automation account, so the wording was corrected to one-way sync.
- The post implied Python files are synced as Python runbooks. Microsoft currently documents source control integration support for PowerShell 5.1 runbooks only, so the Python runbook claim and Python folder example were removed.
- The sample webhook runbook made `VMName` and `ResourceGroupName` mandatory parameters even though webhook requests commonly pass values through `WebhookData`. This would prevent webhook-only invocations from reaching the parsing logic. The parameters were made optional and explicit validation was added after webhook parsing.
- The runbook used `Write-Error` followed by `exit 1` for a missing VM. This was changed to `throw` so the runbook fails clearly with a terminating error.
- The PAT guidance suggested GitHub Apps and did not mention repository hook permissions for auto-sync. Azure Automation source control accepts `PersonalAccessToken` or OAuth token types, and GitHub auto-sync needs repository hook permissions, so the guidance now focuses on PATs and mentions `admin:repo_hook`.
- The source control setup was missing the documented managed identity prerequisite. A sentence was added requiring a system-assigned or user-assigned managed identity with Contributor access on the Automation Account.
- The GitHub Actions module sync example used `azure/login@v1`; Microsoft's current examples use `azure/login@v2`, so it was updated.
- The module sync workflow used `az automation module create`, but the current Azure CLI automation reference no longer lists an `az automation module` command group. The workflow now uses the documented `New-AzAutomationModule` cmdlet with `-ContentLinkUri` and `-RuntimeVersion 5.1`.
- The monitoring commands used `az automation source-control-sync-job ...`, but the current Azure CLI command group is `az automation source-control sync-job ...`. The list and show examples were corrected, including the `--job-id` parameter.

## Review Notes
- The local environment did not have `az` or `pwsh` installed, so command validation was performed against official Microsoft and GitHub documentation rather than local command help.
- The PowerShell syntax-check example uses `PSParser.Tokenize`, which is still documented, though newer tooling often uses `System.Management.Automation.Language.Parser.ParseInput` for AST-based parsing.
