# Validation Summary: How to Use Microsoft Entra ID B2B Direct Connect for Shared Channels in Teams

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Entra ID
- B2B Direct Connect
- Cross-tenant access settings
- Microsoft Teams shared channels
- Microsoft Teams PowerShell
- Microsoft Graph PowerShell
- Conditional Access
- Microsoft Entra sign-in logs
- Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Entra External ID: Set up B2B direct connect with an external organization: https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-direct-connect
- Microsoft Entra External ID: B2B direct connect overview: https://learn.microsoft.com/en-us/entra/external-id/b2b-direct-connect-overview
- Microsoft Teams: Shared channels in Microsoft Teams: https://learn.microsoft.com/en-us/microsoftteams/shared-channels
- Microsoft 365: Collaborate with external participants in a shared channel: https://learn.microsoft.com/en-us/previous-versions/microsoft-365/solutions/collaborate-teams-direct-connect
- Microsoft Teams PowerShell: Set-CsTeamsChannelsPolicy: https://learn.microsoft.com/en-us/powershell/module/microsoftteams/set-csteamschannelspolicy
- Microsoft Teams PowerShell: Grant-CsTeamsChannelsPolicy: https://learn.microsoft.com/en-us/powershell/module/microsoftteams/grant-csteamschannelspolicy
- Microsoft Graph: crossTenantAccessPolicyConfigurationPartner resource type: https://learn.microsoft.com/en-us/graph/api/resources/crosstenantaccesspolicyconfigurationpartner
- Microsoft Graph PowerShell: Update-MgPolicyCrossTenantAccessPolicyPartner: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/update-mgpolicycrosstenantaccesspolicypartner
- Microsoft Graph: conditionalAccessUsers resource type: https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessusers
- Microsoft Graph: conditionalAccessGuestsOrExternalUsers resource type: https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessguestsorexternalusers
- Microsoft Graph: conditionalAccessExternalTenants resource type: https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessexternaltenants
- Microsoft Graph beta: signIn resource type: https://learn.microsoft.com/en-us/graph/api/resources/signin?view=graph-rest-beta
- Microsoft Graph PowerShell beta: Get-MgBetaAuditLogSignIn: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.beta.reports/get-mgbetaauditlogsignin

## Issues Found
- The prerequisites listed Global Administrator as the required Entra role for cross-tenant access settings. Microsoft documentation says Security Administrator is sufficient for updating cross-tenant access settings, so the prerequisite was changed to a Microsoft Entra role that can manage cross-tenant access settings, such as Security Administrator or Global Administrator.
- The prerequisites omitted the documented requirement that guest access be enabled for SharePoint and Microsoft 365 Groups when collaborating with external participants in shared channels. Added that prerequisite.
- The sign-in log PowerShell example used `Get-MgAuditLogSignIn` with a `crossTenantAccessType` filter. The `crossTenantAccessType` property is documented on the Microsoft Graph beta signIn resource, so the example was updated to use `Import-Module Microsoft.Graph.Beta.Reports` and `Get-MgBetaAuditLogSignIn`, with the required `AuditLog.Read.All` scope.
- The Conditional Access policy creation example did not show the Microsoft Graph permissions required to create Conditional Access policies. Added a `Connect-MgGraph` call with `Policy.ReadWrite.ConditionalAccess` and `Application.Read.All` scopes before `New-MgIdentityConditionalAccessPolicy`.
- The common issue for inaccessible shared channel files referred to including the SharePoint application in B2B Direct Connect settings, while the configuration examples use the Office 365 application suite target. Updated the guidance to mention SharePoint/Microsoft 365 Groups guest access and allowing the Office 365 application suite.

## Review Notes
The Microsoft Graph sign-in log query now uses beta because the cross-tenant access type field is documented there. The post should be revisited if Microsoft promotes `crossTenantAccessType` to the v1.0 signIn resource or changes the Microsoft Graph PowerShell module behavior.
