# Validation Summary: How to Set Up Microsoft Entra Conditional Access Auth Strength for

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Entra ID
- Conditional Access
- Authentication strengths
- Microsoft Graph PowerShell SDK
- Microsoft Graph API
- PowerShell
- KQL / Microsoft Entra sign-in logs
- FIDO2 security keys, passkeys, Windows Hello for Business, platform credentials, certificate-based authentication, and Temporary Access Pass

## Sources Consulted
- Microsoft Learn: Conditional Access authentication strengths: https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-strengths
- Microsoft Learn: Microsoft Entra authentication strengths API overview: https://learn.microsoft.com/en-us/graph/api/resources/authenticationstrengths-overview?view=graph-rest-1.0
- Microsoft Learn: List authenticationStrengthPolicies: https://learn.microsoft.com/en-us/graph/api/authenticationstrengthroot-list-policies?view=graph-rest-1.0
- Microsoft Learn: New-MgPolicyAuthenticationStrengthPolicy: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/new-mgpolicyauthenticationstrengthpolicy?view=graph-powershell-1.0
- Microsoft Learn: New-MgIdentityConditionalAccessPolicy: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/new-mgidentityconditionalaccesspolicy?view=graph-powershell-1.0
- Microsoft Learn: conditionalAccessConditionSet resource type: https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessconditionset?view=graph-rest-1.0
- Microsoft Learn: userRegistrationDetails resource type: https://learn.microsoft.com/en-us/graph/api/resources/userregistrationdetails?view=graph-rest-1.0
- Microsoft Learn: Get-MgReportAuthenticationMethodUserRegistrationDetail: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.reports/get-mgreportauthenticationmethoduserregistrationdetail?view=graph-powershell-1.0
- Microsoft Learn: Authentication Methods Activity: https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-methods-activity
- Microsoft Learn: Registration campaign for Microsoft Authenticator: https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-mfa-registration-campaign
- Microsoft Learn: Update-MgPolicyAuthenticationMethodPolicy: https://learn.microsoft.com/en-us/powershell/module/Microsoft.Graph.Identity.SignIns/Update-MgPolicyAuthenticationMethodPolicy?view=graph-powershell-1.0
- Microsoft Learn: Microsoft Entra built-in roles: https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference

## Issues Found
- The built-in strength method lists did not reflect the current Microsoft wording for platform credentials/passkeys. Updated passwordless and phishing-resistant lists and the Mermaid diagram to include passkeys/FIDO2 and Windows Hello for Business or platform credential, and clarified certificate-based authentication as multifactor.
- The first PowerShell example used only `UserAuthenticationMethod.Read.All`, but the registration report cmdlet requires report/audit-log permission. Added `AuditLog.Read.All`.
- The registration report filter used `fido2` for `methodsRegistered`; current Microsoft Graph documentation gives `passKeyDeviceBound` as the relevant registered method value. Updated the filter.
- The Authentication Methods Activity navigation was inaccurate. Updated it to Entra ID > Authentication methods > Activity.
- The custom strength and Conditional Access examples did not show the Graph scopes needed to create/update those resources. Added the relevant `Connect-MgGraph` scopes.
- The Conditional Access Graph payload omitted `ClientAppTypes`, which is part of the Conditional Access condition set expected by Microsoft Graph examples and documentation. Added `ClientAppTypes = @("all")`.
- The registration campaign section implied it could require FIDO2 registration, but Microsoft documents the registration campaign as Microsoft Authenticator-focused in the English documentation. Reworded the section and added the actual `Update-MgPolicyAuthenticationMethodPolicy` call.

## Review Notes
The post is technically relevant and salvageable. The remaining KQL examples are illustrative and depend on the tenant's exported sign-in log schema and method naming, so they should be tested against the target Log Analytics workspace before production use.
