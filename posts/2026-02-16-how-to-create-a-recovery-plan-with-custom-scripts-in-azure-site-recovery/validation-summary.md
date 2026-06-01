# Validation Summary: How to Create a Recovery Plan with Custom Scripts in Azure Site Recovery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Site Recovery
- Recovery Services vault recovery plans
- Azure Automation runbooks
- Azure CLI
- Azure PowerShell Az modules
- Azure App Service connection strings
- Azure DNS
- Azure VM Run Command

## Sources Consulted
- Microsoft Learn: Create and customize recovery plans in Azure Site Recovery - https://learn.microsoft.com/en-au/azure/site-recovery/site-recovery-create-recovery-plans
- Microsoft Learn: Add Azure Automation runbooks to Site Recovery recovery plans - https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-runbook-automation
- Microsoft Learn: Migrate from Azure Automation Run As accounts to managed identities - https://learn.microsoft.com/en-us/azure/automation/migrate-run-as-accounts-managed-identity
- Microsoft Learn: az automation account CLI reference - https://learn.microsoft.com/en-us/cli/azure/automation/account
- Microsoft Learn: Set-AzWebApp cmdlet reference - https://learn.microsoft.com/en-us/powershell/module/az.websites/set-azwebapp
- Microsoft Learn: Remove-AzDnsRecordSet and New-AzDnsRecordSet cmdlet references - https://learn.microsoft.com/en-us/powershell/module/az.dns/remove-azdnsrecordset and https://learn.microsoft.com/en-us/powershell/module/az.dns/new-azdnsrecordset
- Microsoft Learn: Invoke-AzVMRunCommand cmdlet reference - https://learn.microsoft.com/en-us/powershell/module/az.compute/invoke-azvmruncommand
- Microsoft Learn: Azure Automation runbook execution and limits - https://learn.microsoft.com/en-us/azure/automation/automation-runbook-execution and https://learn.microsoft.com/en-us/azure/automation/automation-subscription-limits-faq

## Issues Found
- The prerequisites implied that the Automation account must be in the target region and linked to the vault. Microsoft documents that recovery-plan runbooks can use an Automation account in any Azure region, as long as it is in the same subscription as the Site Recovery vault. Updated the prerequisite wording.
- The authentication guidance mentioned Run As accounts. Azure Automation Run As accounts were retired on September 30, 2023. Updated the post to recommend managed identities for new runbooks.
- The App Service connection-string runbook called Set-AzWebApp with only the changed connection string. Microsoft documents that this replaces the existing connection-string collection. Updated the sample to rebuild the full collection, change matching entries, and submit all connection strings.
- The DNS runbook removed a record set without suppressing confirmation. Added -Confirm:$false so the runbook can run non-interactively.
- The database-health section implied that a failed runbook would stop the recovery plan. Microsoft documents that recovery plans continue even if a script fails. Updated the text to explain that the script records a failure and that a manual action is needed for an operator gate.
- The troubleshooting section stated that the default runbook timeout in a recovery plan is 60 minutes and can be increased in the Automation account. Azure Automation cloud runbooks in an Azure sandbox have a three-hour fair share limit. Updated the guidance to recommend optimization or Hybrid Runbook Worker for long-running scripts.

## Review Notes
Azure Site Recovery's official runbook integration page still shows older AzureRM module examples in places, but current Azure Automation authentication guidance recommends managed identities and Az cmdlets. The post now uses the current managed-identity pattern.
