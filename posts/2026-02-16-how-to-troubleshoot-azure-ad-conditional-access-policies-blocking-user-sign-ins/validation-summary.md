# Validation Summary: How to Troubleshoot Azure AD Conditional Access Policies Blocking User Sign-Ins

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Microsoft Entra ID (formerly Azure AD)
- Conditional Access
- Microsoft Graph audit log and Conditional Access APIs
- Azure CLI `az rest`
- Microsoft Entra sign-in logs
- Continuous Access Evaluation (CAE)
- Exchange Online legacy and modern authentication

## Sources Consulted
- Microsoft Learn: Troubleshoot sign-in problems with Conditional Access - https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access
- Microsoft Learn: Conditional Access What If tool - https://learn.microsoft.com/en-us/entra/identity/conditional-access/what-if-tool
- Microsoft Learn: Analyze Conditional Access Policy Impact - https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only
- Microsoft Learn: List signIns - https://learn.microsoft.com/en-us/graph/api/signin-list?view=graph-rest-1.0
- Microsoft Learn: signIn resource type - https://learn.microsoft.com/en-us/graph/api/resources/signin?view=graph-rest-1.0
- Microsoft Learn: appliedConditionalAccessPolicy resource type - https://learn.microsoft.com/en-us/graph/api/resources/appliedconditionalaccesspolicy?view=graph-rest-1.0
- Microsoft Learn: List Conditional Access namedLocations - https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-list-namedlocations?view=graph-rest-1.0
- Microsoft Learn: List Conditional Access policies - https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-list-policies?view=graph-rest-1.0
- Microsoft Learn: Configure grant controls in Microsoft Entra Conditional Access - https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant
- Microsoft Learn: Enable combined security information registration - https://learn.microsoft.com/en-us/entra/identity/authentication/howto-registration-mfa-sspr-combined
- Microsoft Learn: Continuous access evaluation - https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-continuous-access-evaluation
- Microsoft Learn: user: revokeSignInSessions - https://learn.microsoft.com/en-us/graph/api/user-revokesigninsessions?view=graph-rest-1.0
- Microsoft Learn: Disable Basic authentication in Exchange Online - https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/disable-basic-authentication-in-exchange-online
- Microsoft Learn: Can't connect to Outlook with POP/IMAP and Modern authentication - https://learn.microsoft.com/en-us/exchange/troubleshoot/administration/cannot-connect-mailbox-pop-imap-outlook
- Microsoft Learn: New name for Azure Active Directory - https://learn.microsoft.com/en-us/entra/fundamentals/how-to-rename-azure-ad

## Issues Found
- Updated Azure AD product references in the body and portal paths to Microsoft Entra ID / Microsoft Entra admin center. Microsoft renamed Azure Active Directory to Microsoft Entra ID, and the documented admin center paths now use Entra ID navigation.
- Corrected the MFA registration bootstrap advice. Identity Protection can require MFA registration, but trusted-location registration control is handled through combined security information registration with Conditional Access, and Temporary Access Pass is the appropriate bootstrap option for users who need to register methods.
- Corrected the legacy authentication remediation text. Outlook 2016+ supports modern authentication for Exchange profiles, but Outlook does not support OAuth for Exchange Online POP/IMAP profiles; POP, IMAP, and SMTP clients need explicit OAuth-capable client/protocol configuration or a supported profile type.
- Corrected token lifetime and CAE wording. Default non-CAE access tokens are typically 1 hour, but refresh-token behavior is more nuanced than a simple "up to 90 days for refresh tokens"; CAE also requires CAE-capable clients and resources and applies to specific critical events and supported resources.
- Corrected the report-only Graph query. `reportOnlyFailure` is a result value on `appliedConditionalAccessPolicies`, not a top-level `conditionalAccessStatus` value on the sign-in object. The command now requests unknown enum members and filters the returned sign-ins with Azure CLI JMESPath.
- Updated the grant-control example from approved app to app protection policy to match current Conditional Access guidance.

## Review Notes
The Microsoft Graph endpoint paths for sign-in logs, Conditional Access policies, named locations, and `revokeSignInSessions` are current v1.0 endpoints. The `az rest` examples are structurally valid for Microsoft Graph, but the reviewer environment did not have Azure CLI installed, so CLI execution could not be tested locally.
