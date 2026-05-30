# Validation Summary: Use Azure PowerShell to Manage and Automate Azure Active Directory Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Graph PowerShell SDK
- Microsoft Entra ID / Azure Active Directory
- PowerShell
- Azure Pipelines
- Microsoft Graph user, group, and application APIs

## Sources Consulted
- Microsoft Graph PowerShell `Connect-MgGraph` documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.authentication/connect-mggraph
- Microsoft Graph PowerShell `New-MgUser` documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.users/new-mguser
- Microsoft Graph PowerShell `Get-MgApplication` documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/get-mgapplication
- Microsoft Graph PowerShell `Add-MgApplicationPassword` documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/add-mgapplicationpassword
- Microsoft Entra group management with Microsoft Graph PowerShell: https://learn.microsoft.com/en-us/entra/identity/users/groups-settings-v2-cmdlets
- Microsoft Graph `signInActivity` resource documentation: https://learn.microsoft.com/en-us/graph/api/resources/signinactivity
- Microsoft Entra inactive user account guidance: https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-manage-inactive-user-accounts
- Azure Pipelines `AzurePowerShell@5` task documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-powershell-v5
- Microsoft Entra announcement on AzureAD/MSOnline PowerShell module deprecation: https://techcommunity.microsoft.com/blog/identity/important-update-deprecation-of-azure-ad-powershell-and-msonline-powershell-modu/4094536

## Issues Found
- The legacy `AzureAD` module wording implied it was still generally suitable if an environment uses it. Updated the text and comment to clarify that it is deprecated and should only be installed for maintaining old scripts.
- The interactive `Connect-MgGraph` example lacked `AuditLog.Read.All`, which is required for sign-in activity examples later in the post. Added the scope.
- The inactive-user query used `lastSignInDateTime`, which tracks sign-in attempts and can include failed attempts. Changed it to `lastSuccessfulSignInDateTime`, matching Microsoft guidance for account access/inactive-user reporting.
- The inactive-user query formatted a local time as UTC by appending `Z`. Updated it to call `ToUniversalTime()` before formatting.
- Some examples relied on properties that are not always returned by default. Added explicit `-Property` selections for user department/sign-in activity and application password credentials.
- The app secret rotation example used `$appId` while describing an application object ID. Renamed the variable to `$appObjectId` to match the `-ApplicationId` parameter's expected object identifier.
- The Azure Pipelines section implied an Azure service connection is enough for Microsoft Graph PowerShell authentication. Added a clarification that scripts must still install/import Graph modules and call `Connect-MgGraph`.

## Review Notes
The examples are structurally valid for Microsoft Graph PowerShell, but real automation still requires tenant-specific admin consent, suitable delegated or application permissions, and appropriate Entra roles. Sign-in activity data can lag and `lastSuccessfulSignInDateTime` requires Microsoft Entra ID P1 or P2 licensing.
