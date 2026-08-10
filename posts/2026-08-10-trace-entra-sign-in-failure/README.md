# How to Trace an Entra Sign-In Failure with Correlation IDs, Sign-In Logs, and AADSTS Codes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, Sign-In Logs, AADSTS, Correlation ID, Conditional Access, Authentication, Troubleshooting

Description: Trace a failed Entra authentication request from its browser error to the correct sign-in log, policy result, AADSTS guidance, and application telemetry.

---

A Microsoft Entra sign-in error page usually contains several identifiers:

```text
AADSTS700016: Application with identifier '...' was not found...
Trace ID: 11111111-2222-3333-4444-555555555555
Correlation ID: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
Timestamp: 2026-08-10 09:42:17Z
```

The AADSTS code is a category, not a complete root cause. The correlation ID helps group requests from the same sign-in attempt, the request or trace ID identifies a specific request, and the UTC timestamp narrows the search window. When one exists, the primary Entra-side investigation record is the sign-in event in the tenant that processed the request.

A disciplined investigation moves from the user-visible error to the correct Entra log type, then examines who signed in, which client made the request, which resource was targeted, and which authentication or policy step failed.

## Capture the Evidence Before Retrying

Record the complete error context:

- AADSTS code and sanitized error description;
- correlation ID;
- trace ID or request ID;
- timestamp including timezone, preferably UTC;
- tenant ID or tenant endpoint used;
- application/client ID;
- target resource or requested scope;
- redirect URI for interactive flows;
- user or workload identity;
- whether the attempt was interactive, silent, service-principal, or managed-identity authentication; and
- the application's own request ID and deployment version.

Do not collect client secrets, authorization codes, refresh tokens, access tokens, session cookies, or passwords. A screenshot is useful, but copy identifiers as text to avoid transcription mistakes.

Preserve the first failure. Repeated attempts can produce different correlation IDs or advance an authentication flow to a different failing step.

## Understand the Identifiers

| Identifier | Primary use | Important limitation |
| --- | --- | --- |
| AADSTS code | Find the current error category and Microsoft guidance | AADSTS numbers and descriptions can change or become more granular; use standards-based OAuth error values, not AADSTS numbers or prose, for application control flow |
| Correlation ID | Group requests associated with a sign-in attempt and find log entries | It can be supplied by a client, so Microsoft does not guarantee its accuracy |
| Request ID / trace ID | Identify a particular token or sign-in request | One user journey can generate several requests |
| Timestamp | Bound the search and disambiguate reused client/user combinations | Retain UTC for cross-system correlation; account for admin-center timezone localization and log ingestion delay |

If an application supplies its own correlation ID, generate a new opaque UUID for each authentication transaction and log it consistently. Never put personal data, return URLs containing secrets, or tokens in the value.

## Open the Correct Tenant and Log Type

Sign in to the Microsoft Entra admin center with at least the role required to read sign-in reports, such as Reports Reader, then browse to:

**Entra ID > Monitoring & health > Sign-in logs**

Reports Reader can read the activity logs. To see applied Conditional Access policy details, use a role that can also read those policies; Security Reader is the least-privileged built-in role that grants both capabilities.

First confirm the active directory. A request sent to a customer tenant, the `common` endpoint, or a resource tenant might not be logged in the developer's home tenant.

Entra exposes separate sign-in views:

- **Interactive user sign-ins** when a user supplies an authentication factor, such as a password, MFA response, biometric factor, QR code, or federated assertion;
- **Non-interactive user sign-ins** for delegated requests made on a user's behalf without a new authentication factor, including authorization-code redemption, refresh-token use, and some single sign-on;
- **Service principal sign-ins** for client-credential and other app-only authentication; and
- **Managed identity sign-ins** for Azure resource identities.

Looking only at Interactive user sign-ins is a common reason an engineer concludes that “Entra did not log the failure.” Match each event to its identity and interaction type; one authentication journey can generate requests in both user sign-in views.

## Filter Precisely

Use a narrow time range around the captured UTC timestamp, converting it to the timezone displayed by the Microsoft Entra admin center, then add the **Correlation ID** or **Request ID** filter. The portal also supports filters for status, user, application, resource, IP address, client app, and Conditional Access.

If an exact identifier produces no result:

1. widen the time range to allow for clock differences and ingestion delay;
2. remove the status filter because interrupted sign-ins are not always labeled Failure;
3. check all four sign-in log types;
4. switch to the tenant named in the issuer or error;
5. search by application/client ID and user near the timestamp; and
6. confirm the request reached Microsoft Entra rather than failing in DNS, TLS, a proxy, or the application's pre-redirect validation.

The correlation ID groups a session but is not guaranteed to be trustworthy. Cross-check it against timestamp, application ID, resource, user, IP address, and request ID.

## Read the Event as Who, How, and What

Microsoft organizes sign-in details around three questions:

- **Who:** user, service principal, managed identity, user ID, sign-in identifier, and user type.
- **How:** client application, credential type, authentication requirement, authentication methods, and Continuous Access Evaluation.
- **What:** application and application ID, target resource and resource ID, resource tenant ID, resource service principal ID, and requested access context.

On the **Basic info** tab, confirm that the application ID and target resource match the failing request. Similar display names frequently lead investigators to the wrong Enterprise application.

Then inspect the tabs and fields available for that log type:

- **Authentication details** for user-sign-in authentication methods and which step succeeded or failed;
- **Conditional Access** and **Report-only** for evaluated policies, grant controls, and report-only outcomes;
- **Device info** for managed, compliant, Microsoft Entra hybrid joined, browser, and operating-system state when available;
- **Location** for the recorded IP address and best-effort geography; for confidential-client non-interactive sign-ins, the IP can be from the original token issuance rather than the current refresh request; and
- the **Status** fields on **Basic info** for the failure reason, error code, and additional details.

“Conditional Access: Not applied” is not always proof that policy was irrelevant. Some interrupted flows stop before Conditional Access evaluation. Read the authentication sequence and interruption reason.

## Use the Sign-In Diagnostic

From a failed sign-in's Activity Details panel, launch **Sign-in diagnostic**. Launching it from the sign-in logs requires both Reports Reader and Billing Administrator, or another supported role such as Security Reader. It analyzes the selected event and offers scenario-specific findings and remediation.

The diagnostic is a starting point, not a substitute for verifying configuration. Compare its recommendation with:

- the application registration's supported account types and redirect URIs;
- the tenant-local Enterprise application and consent;
- user or group assignment;
- Conditional Access and authentication-strength requirements;
- client credentials or federated identity credentials;
- requested scopes and target audience; and
- current application deployment configuration.

Keep the original request identifiers when escalating even if the diagnostic suggests a fix.

## Look Up AADSTS Codes Safely

Use Microsoft's current error lookup:

```text
https://login.microsoftonline.com/error?code=700016
```

Also consult the official AADSTS reference. The numeric code narrows the failure family, but context determines the fix. For example:

- an “application not found” error can mean the wrong tenant endpoint, wrong client ID, or absent tenant-local service principal;
- “invalid client secret” can mean an expired secret, the secret ID used instead of its value, encoding damage, or a stale deployment;
- an audience-validation error means the token's `aud` does not match the configured expected audience; check both the requested resource or scopes and the API's expected-audience configuration; and
- a Conditional Access error requires the policy result and authentication details, not just the AADSTS text.

Applications should react to standards-based OAuth `error` values. Use `error_description` only for developer diagnostics, and do not hard-code business behavior around AADSTS numbers or mutable descriptions.

## Query Sign-Ins with Microsoft Graph

For repeatable investigations, Microsoft Graph exposes `auditLogs/signIns`. Programmatic retrieval requires a tenant with Microsoft Entra ID P1 or P2. For delegated tenant-wide access, the client needs `AuditLog.Read.All` and the signed-in user needs a supported directory role such as Reports Reader; a signed-in user can read their own sign-in logs without such a role. App-only access uses the `AuditLog.Read.All` application permission and has no signed-in user role. For an interactive user sign-in, filter by correlation ID:

```http
GET https://graph.microsoft.com/v1.0/auditLogs/signIns?$filter=correlationId eq 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
```

Microsoft Graph PowerShell provides the same pattern:

```powershell
$correlationId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

Get-MgAuditLogSignIn -Filter "correlationId eq '$correlationId'" -All |
  Select-Object CreatedDateTime, Id, CorrelationId, AppId,
    AppDisplayName, ResourceDisplayName, UserPrincipalName,
    ConditionalAccessStatus, Status
```

Do not assume an unqualified v1.0 query returns every sign-in category. Microsoft currently documents explicit `/beta` `signInEventTypes` filters for non-interactive user, service-principal, and managed-identity sign-ins. Beta APIs are subject to change and are not supported for production applications, so use the portal for an interactive investigation or evaluate that limitation before automating those categories.

Treat the returned data as sensitive security telemetry. Limit access, protect exports, and follow the organization's retention and privacy rules. For investigations beyond the built-in retention window, configure diagnostic settings in advance to send the required sign-in log categories to a Log Analytics workspace or storage account, or stream them through an event hub to an approved SIEM with suitable downstream retention.

## Correlate Entra with Application Telemetry

The identity provider log explains the Entra side. The application must explain what happened before and after it:

1. Log a local authentication transaction ID when redirecting to Entra.
2. Record the Entra correlation ID and sanitized OAuth error fields on callback.
3. Record client ID, issuer/tenant, redirect URI identifier, and target resource as non-secret configuration.
4. Trace the callback, code exchange, token validation, and local session creation as separate stages.
5. Link the failed request to the deployment version and configuration revision.

Do not log token bodies. If protocol or token validation fails, log the validation category—issuer, audience, signature key, lifetime, nonce, or state mismatch—and only safe identifiers.

This separation prevents an Entra success followed by an application callback failure from being mislabeled as an identity-provider outage.

## A Practical Decision Tree

### No sign-in event exists

- verify tenant and log type;
- widen the time window;
- check non-interactive, service-principal, and managed-identity views;
- confirm DNS/TLS/proxy connectivity to the authority;
- inspect whether the client rejected configuration before sending a request; and
- verify that the error identifiers came from the current attempt.

### Event failed before credentials or MFA

Check tenant endpoint, client ID, redirect URI, supported account type, service principal presence, consent, user assignment, and protocol parameters.

### Authentication succeeded but policy failed

Inspect Conditional Access, authentication strength, device compliance, location, risk, terms of use, cross-tenant trust, and session controls. Use report-only results carefully; they describe what a policy would have done, not necessarily what blocked this attempt.

### Entra reports success but the app reports failure

Move to application telemetry. Verify `state`, `nonce`, PKCE verifier, callback URI, token endpoint, issuer, audience, signing key, cookie, proxy headers, and session storage. A successful Entra event does not prove the client completed its protocol validation.

### The issue is intermittent

Compare successful and failed events for the same client and user. Focus on tenant, resource, client app, IP, device, authentication method, Conditional Access policy result, and application deployment. Do not compare only the AADSTS code.

## Build a Useful Escalation Package

When escalating to an identity team or Microsoft support, provide:

- UTC timestamp;
- tenant ID;
- application/client ID and target resource;
- correlation ID and request/trace ID;
- AADSTS code;
- affected log type;
- sign-in event ID;
- sanitized failure reason and relevant policy name;
- whether a comparable sign-in succeeded; and
- reproduction steps and deployment version.

Keep secrets and tokens out of tickets. Microsoft documentation specifically calls for the correlation ID, request ID, and error code when deeper support is required.

## Official Documentation

- [Microsoft Entra ID: Sign-in log activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)
- [Microsoft Entra ID: Customize and filter activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-customize-filter-logs)
- [Microsoft Entra ID: Use Sign-in diagnostics](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-use-sign-in-diagnostics)
- [Microsoft identity platform: Authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [Microsoft Entra ID: Analyze a sign-in with Microsoft Graph](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/quickstart-access-log-with-graph-api)
- [Microsoft Entra ID: Analyze activity logs with Microsoft Graph](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-activity-logs-with-microsoft-graph)
- [Microsoft Entra ID: Access activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-access-activity-logs)

## Conclusion

Trace an Entra failure with the full identifier set, not the AADSTS code alone. Search the correct tenant and sign-in log type, validate who initiated the request and which resource it targeted, inspect authentication and Conditional Access details, and then correlate the event with application telemetry. That evidence usually distinguishes identity configuration, policy enforcement, network failure, and client callback bugs without guesswork.
