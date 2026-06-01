# Validation Summary: How to Set Up Azure Automation Hybrid Runbook Workers for On-Premises Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Automation
- Azure Automation Hybrid Runbook Worker
- Azure Arc-enabled servers
- Azure CLI
- Azure Connected Machine agent
- PowerShell
- Active Directory PowerShell module

## Sources Consulted
- Microsoft Learn: Azure Automation Hybrid Runbook Worker overview - https://learn.microsoft.com/en-us/azure/automation/automation-hybrid-runbook-worker
- Microsoft Learn: Deploy an extension-based Windows or Linux User Hybrid Runbook Worker in Azure Automation - https://learn.microsoft.com/en-us/azure/automation/extension-based-hybrid-runbook-worker-install
- Microsoft Learn: Run Azure Automation runbooks on a Hybrid Runbook Worker - https://learn.microsoft.com/en-us/azure/automation/automation-hrw-run-runbooks
- Microsoft Learn: Azure CLI `az automation hrwg` reference - https://learn.microsoft.com/en-us/cli/azure/automation/hrwg
- Microsoft Learn: Azure CLI `az automation hrwg hrw` reference - https://learn.microsoft.com/en-us/cli/azure/automation/hrwg/hrw
- Microsoft Learn: Azure CLI `az automation runbook` reference - https://learn.microsoft.com/en-us/cli/azure/automation/runbook
- Microsoft Learn: Azure CLI `az connectedmachine extension` reference - https://learn.microsoft.com/en-us/cli/azure/connectedmachine/extension
- Microsoft Learn: `azcmagent connect` reference - https://learn.microsoft.com/en-us/azure/azure-arc/servers/azcmagent-connect
- Microsoft Learn: Active Directory `Get-ADUser` reference - https://learn.microsoft.com/en-us/powershell/module/activedirectory/get-aduser

## Issues Found
- Updated the Hybrid Runbook Worker platform description. The post said Microsoft was "moving away" from agent-based workers, but agent-based User Hybrid Runbook Workers retired on August 31, 2024, and jobs on agent-based workers stopped on April 1, 2025.
- Corrected extension-based prerequisites. The post listed .NET Framework 4.7.2 and framed PowerShell 7.2 as the general PowerShell prerequisite. Microsoft documents .NET Framework 4.6.2 or later, Windows PowerShell 5.1 for Windows, minimum machine sizing, and system-assigned managed identity requirements.
- Corrected `az automation hrwg create` to use `--name`, the documented alias for the Hybrid Runbook Worker group name.
- Corrected the Hybrid Worker extension examples to include the documented type handler version and automatic upgrade flag, and replaced the fixed sample endpoint with `<automation-hybrid-service-url>`.
- Corrected the portal instruction for the extension URL. The required value is the Automation Hybrid Service URL, not the generic Automation Account URL.
- Corrected `az automation hrwg hrw create` to use `--hybrid-runbook-worker-id` with a generated GUID. The post used `--hybrid-runbook-worker-name`, which is not a documented parameter.
- Corrected the Active Directory inactive-user example to compare `LastLogonTimestamp` with a FileTime value instead of a `DateTime` object.

## Review Notes
- The sample connectivity runbook uses Windows-specific cmdlets such as `Get-NetIPAddress`; it is appropriate for a Windows Hybrid Worker. A Linux variant would need different commands.
- The Azure CLI `az automation runbook` group is currently marked experimental in Microsoft documentation, although the `--run-on` parameter is documented.
