# Validation Summary: How to Enable and Review Microsoft Defender for Cloud Workload Protection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Defender for Cloud
- Microsoft Defender for Servers Plan 1 and Plan 2
- Microsoft Defender for Endpoint
- Microsoft Defender Vulnerability Management
- Azure Virtual Machines
- Azure PowerShell
- Azure CLI
- Azure Resource Manager REST API
- Log Analytics and Kusto Query Language
- Just-in-time VM access
- File Integrity Monitoring

## Sources Consulted
- Microsoft Learn: Defender for Servers overview: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-servers-overview
- Microsoft Learn: Select a Defender for Servers plan: https://learn.microsoft.com/en-us/azure/defender-for-cloud/plan-defender-for-servers-select-plan
- Microsoft Learn: Defender Vulnerability Management capabilities: https://learn.microsoft.com/en-us/defender-vulnerability-management/defender-vulnerability-management-capabilities
- Microsoft Learn: Defender for Endpoint integration in Defender for Cloud: https://learn.microsoft.com/en-us/azure/defender-for-cloud/integration-defender-for-endpoint
- Microsoft Learn: Common questions - Defender for Servers: https://learn.microsoft.com/en-us/azure/defender-for-cloud/faq-defender-for-servers
- Microsoft Learn: User roles and permissions in Defender for Cloud: https://learn.microsoft.com/en-us/azure/defender-for-cloud/permissions
- Microsoft Learn: Prepare for retirement of the Log Analytics agent: https://learn.microsoft.com/en-us/azure/defender-for-cloud/faq-data-collection-agents
- Microsoft Learn: File Integrity Monitoring overview: https://learn.microsoft.com/en-us/azure/defender-for-cloud/file-integrity-monitoring-overview
- Microsoft Learn: Enable File Integrity Monitoring: https://learn.microsoft.com/azure/defender-for-cloud/file-integrity-monitoring-enable-defender-endpoint
- Microsoft Learn: Set-AzSecurityPricing: https://learn.microsoft.com/en-us/powershell/module/az.security/set-azsecuritypricing
- Microsoft Learn: Azure CLI az security pricing: https://learn.microsoft.com/en-us/cli/azure/security/pricing
- Microsoft Learn: Start-AzJitNetworkAccessPolicy: https://learn.microsoft.com/en-us/powershell/module/az.security/start-azjitnetworkaccesspolicy
- Microsoft Learn: Get-AzAccessToken: https://learn.microsoft.com/en-us/powershell/module/az.accounts/get-azaccesstoken
- Microsoft Learn: Defender for Cloud Sub Assessments REST API: https://learn.microsoft.com/en-us/rest/api/defenderforcloud/sub-assessments
- Microsoft Learn: View exported Defender for Cloud data in Azure Monitor: https://learn.microsoft.com/en-us/azure/defender-for-cloud/continuous-export-view-data
- Microsoft Learn: Defender for Cloud release notes archive: https://learn.microsoft.com/en-us/azure/defender-for-cloud/release-notes-archive

## Issues Found
- The Plan 1 feature list incorrectly said there was no vulnerability assessment. Microsoft documentation shows core Microsoft Defender Vulnerability Management capabilities are supported in Plan 1, while premium capabilities are part of Plan 2. Updated the Plan 1 and Plan 2 feature lists.
- The prerequisites omitted the Contributor role and did not mention that Owner can be required for all plan capabilities. Updated the RBAC prerequisite.
- The Plan 2 feature list included adaptive application controls and adaptive network hardening, which Microsoft deprecated in 2024. Removed those from the plan list and replaced the adaptive application controls section with OS configuration recommendations.
- The Azure CLI command enabled the `VirtualMachines` pricing tier but did not specify the Plan 2 subplan. Added `--subplan P2`.
- The Defender for Endpoint extension section suggested manually deploying `MDE.Windows` with empty settings. Current Microsoft guidance describes automatic deployment through Defender for Cloud; updated the remediation guidance to correct prerequisites and let automatic provisioning redeploy the extension.
- The alert query sorted severity as text, which does not produce the expected High/Medium/Low priority order. Added a severity rank column for sorting.
- The JIT PowerShell request used `Duration`, but `Start-AzJitNetworkAccessPolicy` examples use `endTimeUtc` and an array for `allowedSourceAddressPrefix`. Updated the snippet accordingly.
- The REST API example used `Get-AzAccessToken` as if it returned a plain text token. Current Az.Accounts returns a `SecureString` token by default, so the snippet now converts it before building the Authorization header.
- The vulnerability output claimed to show the top findings by severity but sorted severity alphabetically. Added an explicit High/Medium/Low sort order.
- The File Integrity Monitoring section referred to the workspace as connected to the VMs and listed overly broad default paths. Updated it to describe the workspace as the storage location for change events and used more precise recommended monitored item examples.
- The conclusion still referenced adaptive application controls. Updated it to reference OS configuration assessment and File Integrity Monitoring.

## Review Notes
Azure CLI and PowerShell executables were not installed in the local environment, so command validation was performed against official Microsoft Learn command documentation rather than local `--help` output.
