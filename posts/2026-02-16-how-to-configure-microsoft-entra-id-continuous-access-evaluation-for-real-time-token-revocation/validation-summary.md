# Validation Summary: How to Configure Microsoft Entra ID Continuous Access Evaluation for Real-Time

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Microsoft Entra ID
- Continuous Access Evaluation
- Conditional Access
- Microsoft Graph PowerShell
- Microsoft Graph beta Conditional Access APIs
- Microsoft Authentication Library (MSAL) for Python
- Azure Monitor / Log Analytics KQL

## Sources Consulted
- Microsoft Learn: Continuous access evaluation in Microsoft Entra ID, https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-continuous-access-evaluation
- Microsoft Learn: Conditional Access session controls, https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-session
- Microsoft Learn: continuousAccessEvaluationSessionControl resource type, https://learn.microsoft.com/en-us/graph/api/resources/continuousaccessevaluationsessioncontrol?view=graph-rest-beta
- Microsoft Learn: New-MgBetaIdentityConditionalAccessPolicy, https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.beta.identity.signins/new-mgbetaidentityconditionalaccesspolicy?view=graph-powershell-beta
- Microsoft Learn: Revoke-MgUserSignInSession, https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.users.actions/revoke-mgusersigninsession?view=graph-powershell-1.0
- Microsoft Learn: How to use Continuous Access Evaluation enabled APIs in your applications, https://learn.microsoft.com/en-us/entra/identity-platform/app-resilience-continuous-access-evaluation
- Microsoft Learn: Conditional access and claims challenges in MSAL Python, https://learn.microsoft.com/en-us/entra/msal/python/advanced/conditional-access
- Microsoft Learn: Monitor and troubleshoot continuous access evaluation, https://learn.microsoft.com/en-us/entra/identity/conditional-access/howto-continuous-access-evaluation-troubleshoot
- Microsoft Learn: Azure Monitor SigninLogs table reference, https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs

## Issues Found
- The sequence diagram said CAE-enabled tokens have a 24-hour lifetime. Microsoft documentation states CAE token lifetime can be up to 28 hours, so the diagram was corrected.
- The PowerShell examples used Microsoft Graph v1.0 Conditional Access cmdlets for the `continuousAccessEvaluation` session control. This control is currently documented in Microsoft Graph beta, so the examples now use the beta Conditional Access cmdlets and module.
- The CAE status check implied `disableResilienceDefaults` affects CAE. That setting is for resilience defaults during outages, so the wording was corrected.
- The strict CAE policy example included a `block` grant control, which would block access if enforced. The grant control was removed so the example focuses on the CAE session control.
- The token revocation example used `Invoke-MgInvalidateUserRefreshToken`, which is a beta invalidate-refresh-token action. The current v1.0 Graph PowerShell cmdlet for revoking user sign-in sessions is `Revoke-MgUserSignInSession`, so the example was updated.
- The monitoring section described sign-in logs as showing claims challenges directly. Microsoft documentation describes CAE reporting through CAE token/sign-in details, so the wording and KQL projection were adjusted.
- The Python MSAL sample used client credentials with the `/me` endpoint and `acquire_token_for_client`, which is incompatible with delegated `/me` access and user claims challenges. The sample now uses a public client, declares the `cp1` client capability, parses `WWW-Authenticate`, and reacquires a delegated token interactively with the claims challenge.
- The strict-vs-default section overstated strict enforcement and did not reflect Microsoft Entra's documented standard IP address variation exception. It was rewritten to distinguish default location enforcement from strict location enforcement.

## Review Notes
The post is technically relevant and salvageable. The remaining caveat is that CAE behavior depends on supported resource/client combinations, Conditional Access policy scope, and Microsoft Graph beta API behavior for CAE session-control automation.
