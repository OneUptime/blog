# Validation Summary: Tracing Entra Sign-In Failures with Correlation IDs and AADSTS Codes

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Microsoft Entra ID sign-in logs
- AADSTS authentication and authorization errors
- OAuth 2.0, OpenID Connect, and PKCE
- Microsoft Entra Conditional Access and Sign-in diagnostic
- Microsoft Graph REST API and Microsoft Graph PowerShell
- Azure Monitor, Log Analytics, diagnostic settings, Event Hubs, and SIEM integration

## Sources Consulted

- [Microsoft Entra ID: Sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-ins)
- [Microsoft Entra ID: Sign-in log activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)
- [Microsoft Entra ID: Customize and filter activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-customize-filter-logs)
- [Microsoft Entra ID: Interactive user sign-ins](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-interactive-sign-ins)
- [Microsoft Entra ID: Non-interactive user sign-ins](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-noninteractive-sign-ins)
- [Microsoft Entra ID: Service principal sign-ins](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-service-principal-sign-ins)
- [Microsoft Entra ID: Managed identity sign-ins](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-managed-identity-sign-ins)
- [Microsoft Entra ID: Conditional Access and activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies)
- [Microsoft Entra ID: Use Sign-in diagnostics](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-use-sign-in-diagnostics)
- [Microsoft Entra ID: Least privileged roles by task](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/delegate-by-task)
- [Microsoft identity platform: Authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [Microsoft identity platform: Access tokens](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
- [Microsoft identity platform: OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Microsoft Graph: List signIns v1.0](https://learn.microsoft.com/en-us/graph/api/signin-list?view=graph-rest-1.0)
- [Microsoft Graph: signIn resource v1.0](https://learn.microsoft.com/en-us/graph/api/resources/signin?view=graph-rest-1.0)
- [Microsoft Graph: signIn resource beta](https://learn.microsoft.com/en-us/graph/api/resources/signin?view=graph-rest-beta)
- [Microsoft Graph PowerShell: Get-MgAuditLogSignIn](https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.reports/get-mgauditlogsignin?view=graph-powershell-1.0)
- [Microsoft Entra ID: Analyze activity logs with Microsoft Graph](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-activity-logs-with-microsoft-graph)
- [Microsoft Entra ID: Access activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-access-activity-logs)
- [Microsoft Entra ID: Configure diagnostic settings](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-configure-diagnostic-settings)
- [Microsoft Entra ID: Data retention](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention)
- [Microsoft.Identity.Web: Logging and diagnostics](https://learn.microsoft.com/en-us/entra/msidweb/advanced/logging)
- [RFC 6749: OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749.html)
- [RFC 7636: Proof Key for Code Exchange](https://www.rfc-editor.org/rfc/rfc7636.html)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)

## Issues Found

- The AADSTS guidance warned only against depending on human-readable descriptions. It now states that both AADSTS numbers and descriptions are diagnostic-only for application behavior, and directs applications to react to standards-based OAuth `error` values rather than `error_description` or AADSTS values.
- The role guidance implied that Reports Reader was sufficient for the whole workflow. It now distinguishes basic log access from viewing applied Conditional Access policies and launching Sign-in diagnostic, including the documented Security Reader alternative and the Reports Reader plus Billing Administrator least-privilege combination for the diagnostic.
- The interactive sign-in definition incorrectly treated browser or user-present activity as inherently interactive. It now follows Microsoft's authentication-factor definition, expands the non-interactive examples, and notes that one authentication journey can create both interactive and non-interactive events.
- The portal filtering instruction treated the admin center as UTC. It now retains UTC for cross-system correlation while requiring conversion to the viewing administrator's localized portal timezone.
- The Who/How/What mapping and activity-detail labels were imprecise. The application and resource identifiers are now under What, Report-only is identified separately from Conditional Access, and Status is correctly located on Basic info.
- The Location guidance called every recorded address the source IP. It now notes the best-effort nature of geolocation and the documented confidential-client case in which a non-interactive event shows the original token-issuance IP rather than the current refresh source.
- A no-log troubleshooting step referred to an application callback occurring before authentication. It now correctly refers to application pre-redirect validation.
- The invalid-audience explanation attributed the problem only to requesting the wrong resource. It now covers both the requested resource or scopes and the API's configured expected audience.
- The Microsoft Graph permission wording was too broad and the v1.0 example was labeled for any user sign-in. It now scopes the admin-role requirement to tenant-wide delegated access, notes the own-sign-in exception, and labels the v1.0 correlation query as an interactive-user query.
- The diagnostic-settings destinations were imprecise. The post now distinguishes Log Analytics and storage destinations from Event Hubs-based SIEM streaming and calls out downstream retention.
- OAuth `state` mismatch was categorized solely as token validation. The wording now correctly covers protocol or token validation.
- The Entra event was described as universally present and authoritative despite the guide's no-event branch. It is now described as the primary Entra-side record when an event exists.

## Review Notes

- The REST and PowerShell correlation-ID examples are syntactically correct and use supported v1.0 APIs and cmdlets.
- The post correctly warns that an unqualified v1.0 query does not cover all sign-in categories. The documented `signInEventTypes` filters for non-interactive, service-principal, and managed-identity sign-ins remain beta and unsupported for production applications.
- The PowerShell example selects `ConditionalAccessStatus`, which is available with `AuditLog.Read.All`. Retrieving individual applied Conditional Access policy objects requires an additional policy-reading permission and an appropriate delegated role where applicable.
- Non-interactive, service-principal, and managed-identity entries can be aggregated into grouped portal rows; investigators might need to expand a row to inspect individual timestamps and requests.
- All links in the post's Official Documentation section resolve to the intended Microsoft Learn resources.
