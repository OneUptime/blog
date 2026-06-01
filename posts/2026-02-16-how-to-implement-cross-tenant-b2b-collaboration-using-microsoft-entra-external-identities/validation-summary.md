# Validation Summary: How to Use Cross-Tenant B2B Collaboration

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Entra External ID
- Microsoft Entra B2B collaboration
- Cross-tenant access settings
- Microsoft Graph PowerShell SDK
- Conditional Access
- Microsoft Entra access reviews
- Azure Monitor Log Analytics / Kusto Query Language

## Sources Consulted
- Microsoft Learn: Configure external collaboration settings for B2B in Microsoft Entra External ID: https://learn.microsoft.com/en-us/entra/external-id/external-collaboration-settings-configure
- Microsoft Learn: Allow or block B2B collaboration with organizations: https://learn.microsoft.com/en-gb/entra/external-id/allow-deny-list
- Microsoft Learn: Understand and manage the properties of B2B guest users: https://learn.microsoft.com/en-us/azure/active-directory/external-identities/user-token
- Microsoft Learn: Cross-tenant access settings API overview: https://learn.microsoft.com/en-us/graph/api/resources/crosstenantaccesspolicy-overview
- Microsoft Learn: crossTenantAccessPolicyConfigurationDefault resource type: https://learn.microsoft.com/en-us/graph/api/resources/crosstenantaccesspolicyconfigurationdefault
- Microsoft Learn: Update crossTenantAccessPolicyConfigurationDefault: https://learn.microsoft.com/en-us/graph/api/crosstenantaccesspolicyconfigurationdefault-update
- Microsoft Learn: New-MgInvitation: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/new-mginvitation
- Microsoft Learn: New-MgGroupMember examples: https://learn.microsoft.com/en-us/entra/identity/users/groups-settings-v2-cmdlets
- Microsoft Learn: conditionalAccessGuestsOrExternalUsers resource type: https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessguestsorexternalusers
- Microsoft Learn: New-MgIdentityConditionalAccessPolicy: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/new-mgidentityconditionalaccesspolicy
- Microsoft Learn: Add self-service sign-up user flows for B2B collaboration: https://learn.microsoft.com/en-us/entra/external-id/self-service-sign-up-user-flow
- Microsoft Learn: Configure access review scope using Microsoft Graph APIs: https://learn.microsoft.com/en-us/graph/accessreviews-scope-concept
- Microsoft Learn: Configure access reviewers using access reviews APIs: https://learn.microsoft.com/en-us/graph/accessreviews-reviewers-concept
- Microsoft Learn: New-MgIdentityGovernanceAccessReviewDefinition: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.governance/new-mgidentitygovernanceaccessreviewdefinition
- Microsoft Learn: Azure Monitor Logs reference - SigninLogs: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs

## Issues Found
- The B2B flow stated that no account is created in the resource tenant and showed guest object creation only at first access. Updated this to clarify that no password or credentials are created in the resource tenant, but a guest user object is created or used in the directory.
- The collaboration restrictions PowerShell snippet used non-documented fields (`AllowedTargetTenants` and `IsAllowedList`) for domain allowlists. Replaced it with portal-based instructions, which match the documented configuration path for allow/block domain restrictions.
- The device trust wording used the older "hybrid Azure AD join" term. Updated it to "hybrid Microsoft Entra joined devices."
- The programmatic invitation sample added a guest to a group but connected only with `User.Invite.All`. Added `GroupMember.ReadWrite.All` so the group membership command has the required delegated permission.
- The Conditional Access sample comment said the policy applied to untrusted locations, but the policy did not include a location condition. Updated the comment to match the actual policy.
- The access review sample built a request body but did not create the access review, and its scope did not match the documented pattern for reviewing guest access across groups. Updated it to use `InstanceEnumerationScope`, the documented guest member scope, group owners as reviewers, fallback reviewers, and `New-MgIdentityGovernanceAccessReviewDefinition`.
- The security best practice "always trust MFA" was too absolute. Changed it to recommend considering MFA trust only for known partner tenants with validated MFA controls.

## Review Notes
The remaining snippets are representative examples and still require tenant-specific IDs, admin roles, licensing, consent, and partner trust decisions before use in production. Conditional Access and Identity Governance capabilities may require appropriate Microsoft Entra licensing.
