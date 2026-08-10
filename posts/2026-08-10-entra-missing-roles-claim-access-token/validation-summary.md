# Validation Summary: Why the `roles` Claim Is Missing from an Entra Access Token

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Microsoft Entra ID application registrations and enterprise applications
- OAuth 2.0, OpenID Connect, and the client credentials grant
- JWT access-token and ID-token claims (`aud`, `roles`, `scp`, `azp`, `appid`, `idtyp`, and `oid`)
- Entra app roles, delegated permissions, application permissions, consent, and app-role assignments
- Microsoft Graph app-role-assignment endpoints
- MSAL token caching and token refresh behavior
- Entra group claims, claims-mapping policies, and SAML claim configuration

## Sources Consulted

- [Add app roles to your application and receive them in the token](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps)
- [Access token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference)
- [Access tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
- [OAuth 2.0 authorization code flow on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [OAuth 2.0 client credentials flow on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [Scopes and permissions in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc)
- [Protected web API: Verify scopes and app roles](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-protected-web-api-verification-scope-app-roles)
- [Configure optional claims](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims)
- [Configure group claims for applications](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims)
- [Claims customization using a claims-mapping policy](https://learn.microsoft.com/en-us/entra/identity-platform/claims-customization-powershell)
- [Application and service principal objects in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals)
- [Overview of permissions and consent](https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview)
- [Manage users and groups assigned to an application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/assign-user-or-group-access-portal)
- [List app-role assignments granted to a service principal](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list-approleassignments?view=graph-rest-1.0)
- [List app-role assignments granted for a resource service principal](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list-approleassignedto?view=graph-rest-1.0)
- [appRoleAssignment resource type](https://learn.microsoft.com/en-us/graph/api/resources/approleassignment?view=graph-rest-1.0)

## Issues Found

- The OIDC wording implied that one token response could return multiple access tokens. It now distinguishes the ID token returned for sign-in from access tokens obtained by OAuth token requests associated with the session.
- The client-credentials instruction showed `{resource}/.default` without identifying it as the `scope` parameter. It now uses `scope={resource}/.default`, identifies the v2.0 token endpoint, and defines the resource as the API's Application ID URI.
- The example payload used v2-only `azp` and the optional `idtyp` claim without qualification. It is now explicitly a v2.0 example, includes `ver`, states that `idtyp` must be configured on the resource API, and identifies `appid` as the v1.0 equivalent of `azp`.
- The nested-group caveat was too general for enterprise-application assignments. It now states that assignments do not cascade to nested groups and that only direct user members are effective.
- The JWT claim-customization check pointed to **Enterprise applications > Single sign-on > Attributes & Claims**, which is the SAML-oriented route. It now points to the resource API's **App registrations > Token configuration** page or `optionalClaims.accessToken` manifest entry, and separately describes JWT claims-mapping policies and SAML claim configuration.
- The API authorization checklist could be read as allowing a user app role to replace delegated-scope validation. It now requires the delegated scope, plus any policy-required user app role, for user calls and the application role for app-only calls.

## Review Notes

- Microsoft Entra can intentionally issue an app-only token without a `roles` claim for an API designed to use an explicit application ACL. That is a separate authorization design and must not become an implicit fallback for a role-protected API.
- All five Microsoft Learn links already present in the post resolve to the intended documentation. The **Configure the role claim** page is valid but focuses heavily on service-principal and SAML configuration; the optional-claims documentation is the relevant source for the corrected JWT access-token portal path.
- No deprecated APIs, invalid JSON, or invalid Microsoft Graph endpoint paths remain in the post.
