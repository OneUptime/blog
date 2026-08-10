# Validation Summary: Delegated vs Application Permissions in Entra ID: Which OAuth Flow Uses Each?

## Status
validated

## Post Type
Technical guide and reference

## Technologies Covered

- Microsoft Entra ID and the Microsoft identity platform
- OAuth 2.0 delegated and app-only authorization
- Authorization code flow with PKCE
- Device authorization grant
- On-behalf-of flow
- Client credentials flow
- Managed identities and workload identity federation
- OAuth scopes, app roles, consent, and service principals
- Microsoft Graph access-token claims and API token validation

## Sources Consulted

- [Overview of permissions and consent in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview)
- [Scopes and permissions in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc)
- [Access token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference)
- [Access tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
- [OAuth 2.0 client credentials flow on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [Microsoft identity platform and OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [OAuth 2.0 device authorization grant flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code)
- [OAuth 2.0 on-behalf-of flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow)
- [Authentication flow support in MSAL](https://learn.microsoft.com/en-us/entra/msal/msal-authentication-flows)
- [Configure and manage optional claims](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims)
- [Manage app consent policies](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/manage-app-consent-policies)
- [Add app roles and receive them in the token](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps)
- [Verify scopes and app roles in a protected web API](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-protected-web-api-verification-scope-app-roles)
- [Managed identities for Azure resources](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview)
- [Acquire a managed identity access token on an Azure VM](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-to-use-vm-token)
- [Workload identity federation](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation)
- [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [Microsoft Entra sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-ins)
- [OAuth 2.0 Authorization Framework (RFC 6749)](https://www.rfc-editor.org/rfc/rfc6749.html)
- [OAuth 2.0 Security Best Current Practice (RFC 9700)](https://www.rfc-editor.org/rfc/rfc9700.html)

## Issues Found

- The consent section stated that application permissions always require administrator consent. Microsoft Entra also allows an owner of a custom API's resource service principal to consent to app roles exposed by that service principal. The text now documents that exception while retaining administrator consent as the general rule.
- The client-credentials failure guidance prescribed application permissions and admin consent for every API. Custom APIs can instead authorize app-only callers through an application ACL and can receive role-less app-only tokens. The guidance now directs readers to the target API's app-role or ACL model and retains the required `.default` token request.
- The scheduled-processing guidance could imply that any unattended continuation must become app-only, even though delegated `offline_access` can support continued access on a user's behalf. The app-only recommendation is now limited to work that must continue independently of the user's identity and authorization.
- The API security checklist omitted access-token signature validation. Signature validation was added alongside issuer, audience, lifetime, token-version, and permission checks.
- The conclusion described client credentials as the unqualified token-acquisition method for application permissions despite the post's managed-identity exception. It now distinguishes standard confidential clients from Azure managed identities.
- The form-encoded client-credentials request body was displayed with raw line breaks between parameters. The parameters are now on one line so the HTTP example is valid when sent literally.

## Review Notes

The JSON claim examples and HTTP client-credentials request are syntactically correct and consistent with the v2 Microsoft identity platform documentation. The claim sets are appropriately labeled as illustrative: `scp` is used for delegated scopes, `roles` normally carries application permissions but can also carry a user's app roles, and `idtyp` is optional. The post also correctly warns clients to treat access tokens for APIs they do not own as opaque. All external documentation and author links in the post resolved successfully during validation. No version-specific commands or library APIs required testing.
