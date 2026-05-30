# Validation Summary: How to Set Up Azure Desired State Configuration for Windows Server Compliance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Automation State Configuration
- PowerShell Desired State Configuration
- Az.Automation PowerShell module
- Windows Server roles and features
- IIS
- Windows registry configuration

## Sources Consulted
- Microsoft Learn: Compile DSC configurations in Azure Automation State Configuration - https://learn.microsoft.com/en-us/azure/automation/automation-dsc-compile
- Microsoft Learn: New-AzAutomationAccount - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationaccount
- Microsoft Learn: New-AzAutomationModule - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationmodule
- Microsoft Learn: Import-AzAutomationDscConfiguration - https://learn.microsoft.com/en-us/powershell/module/az.automation/import-azautomationdscconfiguration
- Microsoft Learn: Start-AzAutomationDscCompilationJob - https://learn.microsoft.com/en-us/powershell/module/az.automation/start-azautomationdsccompilationjob
- Microsoft Learn: Get-AzAutomationDscCompilationJob - https://learn.microsoft.com/en-us/powershell/module/az.automation/get-azautomationdsccompilationjob
- Microsoft Learn: Register-AzAutomationDscNode - https://learn.microsoft.com/en-us/powershell/module/az.automation/register-azautomationdscnode
- Microsoft Learn: Get-AzAutomationDscNode - https://learn.microsoft.com/en-us/powershell/module/az.automation/get-azautomationdscnode
- Microsoft Learn: Configuring the Local Configuration Manager - https://learn.microsoft.com/en-us/powershell/dsc/managing-nodes/metaconfig
- Microsoft Learn: WindowsFeature DSC resource - https://learn.microsoft.com/en-us/powershell/dsc/reference/psdscresources/resources/windowsfeature/windowsfeature
- Microsoft Learn: Registry DSC resource - https://learn.microsoft.com/en-us/powershell/dsc/reference/psdscresources/resources/registry/registry
- PowerShell Gallery: SecurityPolicyDsc 2.10.0.0 - https://www.powershellgallery.com/packages/SecurityPolicyDsc/2.10.0.0
- PowerShell Gallery: AuditPolicyDsc 1.4.0.0 - https://www.powershellgallery.com/packages/AuditPolicyDsc/1.4.0.0

## Issues Found
- Azure Automation DSC terminology and lifecycle were outdated. Updated references to Azure Automation State Configuration where appropriate and added the official September 30, 2027 retirement caveat with Azure Machine Configuration as the migration target.
- The `Web-Asp-Net45` Windows feature was described as ASP.NET 4.8. Changed the description to ASP.NET 4.x support, which better matches the Windows feature name.
- The `File` resource example claimed to remove the default IIS site, but it only removes the default welcome page file. Updated the comment and resource name to describe the actual behavior.
- The node status list said there were only three statuses and used `Not Compliant` with a space. Updated the list to use `NotCompliant` and include the other documented status values.
- The compliance report divided by `$nodes.Count` without handling an empty result set. Added a guard so the example works when no DSC nodes are registered.

## Review Notes
The Az.Automation cmdlets and parameters used in the examples match current Microsoft Learn documentation. The imported `SecurityPolicyDsc` and `AuditPolicyDsc` modules are valid PowerShell Gallery packages, although the sample configuration does not currently use resources from those modules.
