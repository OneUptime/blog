# Validation Summary: How to Configure Azure Automation Desired State Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Automation State Configuration
- PowerShell Desired State Configuration
- Az.Automation PowerShell module
- Windows Server DSC resources
- Local Configuration Manager

## Sources Consulted
- Microsoft Learn: Enable Azure Automation State Configuration - https://learn.microsoft.com/en-us/azure/automation/automation-dsc-onboarding
- Microsoft Learn: Compile DSC configurations in Azure Automation State Configuration - https://learn.microsoft.com/en-us/azure/automation/automation-dsc-compile
- Microsoft Learn: Register-AzAutomationDscNode - https://learn.microsoft.com/en-us/powershell/module/az.automation/register-azautomationdscnode
- Microsoft Learn: Import-AzAutomationDscConfiguration - https://learn.microsoft.com/en-us/powershell/module/az.automation/import-azautomationdscconfiguration
- Microsoft Learn: Start-AzAutomationDscCompilationJob - https://learn.microsoft.com/en-us/powershell/module/az.automation/start-azautomationdsccompilationjob
- Microsoft Learn: Get-AzAutomationRegistrationInfo - https://learn.microsoft.com/en-us/powershell/module/az.automation/get-azautomationregistrationinfo
- Microsoft Learn: Get-AzAutomationDscNodeReport - https://learn.microsoft.com/en-us/powershell/module/az.automation/get-azautomationdscnodereport
- Microsoft Learn: Configuring the Local Configuration Manager - https://learn.microsoft.com/en-us/powershell/dsc/managing-nodes/metaconfig
- Microsoft Learn: WindowsFeature DSC resource - https://learn.microsoft.com/en-us/powershell/dsc/reference/psdscresources/resources/windowsfeature/windowsfeature
- Microsoft Learn: Service DSC resource - https://learn.microsoft.com/en-us/powershell/dsc/reference/psdscresources/resources/service/service

## Issues Found
- The post omitted Microsoft's announced Azure Automation State Configuration retirement date. Added a short note that the service retires on September 30, 2027 and that new long-term investments should plan for Azure Machine Configuration.
- The DSC example used `StartType` in the `Service` resource. The correct property is `StartupType`, so the example was updated to compile correctly.
- The IIS example described `Web-Asp-Net45` as ASP.NET 4.8. The Windows feature name represents the ASP.NET 4.x IIS role service, so the wording and resource name were adjusted.
- The portal upload instructions said to add new configurations through the portal. Microsoft removed the Add, Compose configuration, and Gallery portal links on March 31, 2025, so this was corrected to direct new uploads through PowerShell while preserving the portal compile note for already imported configurations.
- The on-premises onboarding text said to install the DSC extension manually. For non-Azure or hybrid machines, Microsoft documents DSC metaconfiguration/LCM registration, so the wording was corrected.
- The on-premises LCM sample used `ConfigurationNames = @("WebServerConfig")`, but Azure Automation node configuration names include the configuration and node name, such as `WebServerConfig.localhost`. Updated the sample accordingly.

## Review Notes
Azure Automation State Configuration is still technically usable as of June 1, 2026, but it is in a retirement window. A future revision should consider reframing the article around Azure Machine Configuration for new deployments.
