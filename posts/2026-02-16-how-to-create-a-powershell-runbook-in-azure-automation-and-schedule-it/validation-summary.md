# Validation Summary: How to Create a PowerShell Runbook in Azure Automation and Schedule It

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Automation
- Azure CLI
- Azure PowerShell / Az PowerShell modules
- PowerShell runbooks
- Managed identities
- Azure RBAC
- Azure Automation schedules

## Sources Consulted
- Microsoft Learn: Azure CLI `az automation account` reference: https://learn.microsoft.com/en-us/cli/azure/automation/account?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az automation runbook` reference: https://learn.microsoft.com/en-us/cli/azure/automation/runbook?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az automation schedule` reference: https://learn.microsoft.com/en-us/cli/azure/automation/schedule?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az automation job` reference: https://learn.microsoft.com/en-us/cli/azure/automation/job?view=azure-cli-latest
- Microsoft Learn: Azure Automation runbook types: https://learn.microsoft.com/en-us/azure/automation/automation-runbook-types
- Microsoft Learn: Manage schedules in Azure Automation: https://learn.microsoft.com/en-us/azure/automation/shared-resources/schedules
- Microsoft Learn: Start a runbook in Azure Automation: https://learn.microsoft.com/en-us/azure/automation/start-runbooks
- Microsoft Learn: Using a system-assigned managed identity for an Azure Automation account: https://learn.microsoft.com/en-us/azure/automation/enable-managed-identity-for-automation
- Microsoft Learn: Runbook execution in Azure Automation: https://learn.microsoft.com/en-us/azure/automation/automation-runbook-execution
- Microsoft Learn: Azure Automation subscription limits and quotas: https://learn.microsoft.com/en-us/azure/automation/automation-subscription-limits-faq

## Issues Found
- The Azure CLI `az automation account create` command used a non-existent `--assign-identity` option. I removed that flag and added a documented REST PATCH call to enable the system-assigned managed identity.
- The post recommended PowerShell runtime version 7.2. Microsoft documentation now recommends PowerShell 7.4 because 7.2 is no longer supported by the parent PowerShell product. I changed the runtime guidance to 7.4.
- The unused disk example was described as sending an email, but the script only writes to the output stream. I corrected the description to match the code.
- The timeout guidance said to increase the runbook timeout in settings. Azure sandbox jobs have a 3-hour fair share limit, so I changed the guidance to optimize, split work into child runbooks, or use a Hybrid Runbook Worker.
- The schedule examples used start times that are in the past as of this validation date. I updated them to future example start times and added a note that start times must be in the future when the schedule is created.
- The schedule examples used hyphens in schedule names. Microsoft documentation notes that Automation schedule names do not currently support special characters, so I changed the example schedule names to alphanumeric names.
- Step 8 used `az automation runbook start --schedule-name` to link a schedule. The Azure CLI start command starts a runbook job and has no `--schedule-name` option. I replaced it with `Register-AzAutomationScheduledRunbook`, the documented Az PowerShell cmdlet for associating a runbook with a schedule.
- The tag-filtered VM example indexed into `Tags` without checking whether the VM had any tags. I added a null check so untagged VMs do not cause a PowerShell indexing error.

## Review Notes
The Azure CLI Automation runbook commands are currently documented as experimental commands in the Azure CLI automation extension. The post's CLI examples are otherwise aligned with the documented command shapes.
