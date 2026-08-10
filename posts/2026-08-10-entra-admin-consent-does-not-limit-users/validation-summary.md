# Validation Summary: Why “Grant Admin Consent” Does Not Limit an Entra App to One User

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered
- Microsoft Entra ID
- Microsoft Entra enterprise applications and service principals
- Microsoft identity platform consent and permission grants
- OAuth 2.0 delegated permissions and application permissions
- Microsoft Graph `oauth2PermissionGrant` and app-role assignments
- Enterprise-application user and group assignment
- OAuth 2.0 client credentials flow
- Microsoft Entra access-token claims and sign-in logs

## Sources Consulted
- Microsoft Learn — Application consent management and evaluation of consent requests: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/manage-consent-requests
- Microsoft Learn — Review and take action on admin consent requests: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/review-admin-consent-requests
- Microsoft Learn — Frequently asked questions about the admin consent workflow: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/admin-consent-workflow-faq
- Microsoft Learn — Grant tenant-wide admin consent to an application: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/grant-admin-consent
- Microsoft Learn — Overview of permissions and consent in the Microsoft identity platform: https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview
- Microsoft Learn — Restrict a Microsoft Entra app to a set of users: https://learn.microsoft.com/en-us/entra/identity-platform/howto-restrict-your-app-to-a-set-of-users
- Microsoft Learn — Properties of an enterprise application: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/application-properties
- Microsoft Learn — Manage users and groups assignment to an application: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/assign-user-or-group-access-portal
- Microsoft Graph — `servicePrincipal` resource type and `appRoleAssignmentRequired`: https://learn.microsoft.com/en-us/graph/api/resources/serviceprincipal?view=graph-rest-1.0
- Microsoft Learn — Grant consent on behalf of a single user: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/grant-consent-single-user
- Microsoft Graph — `oAuth2PermissionGrant` resource type: https://learn.microsoft.com/en-us/graph/api/resources/oauth2permissiongrant?view=graph-rest-1.0
- Microsoft Learn — OAuth 2.0 client credentials flow on the Microsoft identity platform: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow
- Microsoft Learn — Scopes and permissions in the Microsoft identity platform (`/.default`): https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc
- Microsoft Learn — Access tokens in the Microsoft identity platform: https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
- Microsoft Learn — Access token claims reference: https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference
- Microsoft Learn — Configure how users consent to applications: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent
- Microsoft Learn — Microsoft Entra sign-in log types: https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-ins
- Microsoft Graph — Permissions reference (`User.Read`, `Files.Read`, and application permissions): https://learn.microsoft.com/en-us/graph/permissions-reference
- IETF RFC 6749 — OAuth 2.0 client credentials access-token request: https://www.rfc-editor.org/rfc/rfc6749#section-4.4.2

## Issues Found

### 1. Assignment and consent interaction was stated too categorically
- **What was wrong:** The post said that changing consent or assignment does not implicitly configure the other. The underlying grant and assignment objects are separate, but enabling **Assignment required?** also prevents users from granting individual consent for that application, so the original wording omitted an operationally important interaction.
- **What was changed:** Clarified that changing one control does not create or remove the other's directory objects, while noting that requiring assignment disables individual user consent and therefore requires an administrator to grant the app's needed permissions.
- **Why:** Microsoft's app-restriction documentation explicitly states that user consent is not allowed when an application requires assignment and advises granting tenant-wide admin consent for such applications.

### 2. Client-credentials form body implied literal line breaks
- **What was wrong:** The `application/x-www-form-urlencoded` body was split across lines without saying that the breaks were only for display, and the secret placeholder said only “encoded.” Sending those line breaks literally can alter form values; Microsoft specifically requires the client secret to be URL-encoded.
- **What was changed:** Identified the snippet as an `application/x-www-form-urlencoded` body, placed it on one line, and changed the placeholder to `<url-encoded-secret>`.
- **Why:** The Microsoft identity platform client-credentials documentation defines these exact fields and requires a URL-encoded client secret. A single-line body can be sent as shown after replacing the placeholders.

### 3. Token-claim inspection guidance was overbroad
- **What was wrong:** The verification checklist told readers to confirm the token audience and `scp` or `roles` values without distinguishing tokens for an API they control from tokens for Microsoft-owned APIs such as Microsoft Graph. Client applications must treat access tokens as opaque, and Microsoft-owned API tokens are not guaranteed to be readable JWTs.
- **What was changed:** Limited claim validation to the resource API that the reader controls and described decoding Microsoft-owned API tokens as a debugging aid only. The warning not to log raw access tokens was retained.
- **Why:** Microsoft states that client applications must treat access tokens as opaque and that only the resource server should validate them. Decoding is acceptable for validation and debugging, but code must not depend on the format or claims of tokens issued for APIs it does not own.

## Review Notes
- The central claim is correct: tenant-wide admin consent grants permissions on behalf of the organization and does not make the requestor or consenting administrator a one-user access boundary.
- Delegated permissions, application permissions, `oauth2PermissionGrant`, app-role assignments, and the distinction between `scp` and `roles` were verified against current Microsoft documentation.
- The principal-specific delegated consent design is current: `consentType` is `Principal`, `principalId` identifies the user, and application assignment remains a separate step. It does not apply to application permissions.
- The **Assignment required?** portal flow, the `appRoleAssignmentRequired` Graph property, and the documented Global Administrator exception are accurate. The feature applies to supported enterprise-application integration types, which the post already acknowledges through its integration-type caveat.
- Group-based assignment requires Microsoft Entra ID P1 or P2. Nested group membership does not cascade for application assignment, but the post makes no contrary claim.
- `User.Read` and `Files.Read` remain valid delegated Microsoft Graph permissions. Neither requires administrator consent by default, but an administrator can still grant tenant-wide consent for them as the example describes.
- The client-secret variant of client credentials remains supported. Microsoft recommends certificates or federated credentials for higher assurance, but the shared-secret example is not deprecated.
- Microsoft Entra currently separates sign-in logs into interactive user, non-interactive user, service principal, and managed identity categories, matching the post.
- All six links in the post's **Official Documentation** section resolved successfully to the intended Microsoft Learn pages during validation.
- No unresolved technical issues remain after the corrections above.
