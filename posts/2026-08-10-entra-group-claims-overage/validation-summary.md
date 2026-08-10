# Validation Summary: Why Entra Group Claims Disappear for Users in Many Groups—and How to Handle Overage

## Status

validated

## Post Type

Technical guide and authorization implementation reference

## Technologies Covered

- Microsoft Entra ID
- Microsoft identity platform token claims
- OAuth 2.0 and OpenID Connect access and ID tokens
- JSON Web Tokens (JWT)
- SAML assertions
- Microsoft Graph REST API
- OAuth 2.0 on-behalf-of flow
- Group-based authorization and application roles

## Sources Consulted

- [Configure group claims for applications by using Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims)
- [Access token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference)
- [Access tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
- [Configure group claims and app roles in tokens](https://learn.microsoft.com/en-us/security/zero-trust/develop/configure-tokens-group-claims-app-roles)
- [Add app roles and get them from a token](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps)
- [Microsoft Graph `directoryObject: getMemberObjects`](https://learn.microsoft.com/en-us/graph/api/directoryobject-getmemberobjects?view=graph-rest-1.0)
- [Microsoft Graph: List a user's memberships (direct and transitive)](https://learn.microsoft.com/en-us/graph/api/user-list-transitivememberof?view=graph-rest-1.0)
- [Microsoft Graph authentication and authorization basics](https://learn.microsoft.com/en-us/graph/auth/auth-concepts)
- [Microsoft identity platform and OAuth 2.0 on-behalf-of flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow)
- [Microsoft Graph throttling guidance](https://learn.microsoft.com/en-us/graph/throttling)
- [Revoke user access in an emergency in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/users/users-revoke-access)

## Issues Found

No technical issues found.

## Review Notes

The post's 200-group JWT limit, 150-group SAML limit, five-group implicit-flow limit, overage-marker handling, and warning not to follow the legacy `_claim_sources` endpoint are supported by the Microsoft Entra group-claims and access-token claims references. Microsoft currently has an inconsistency across its own documentation: the group-claims configuration page says the implicit-flow limit is five and emits `hasgroups` above five, while the Zero Trust group-claims page says six. The post follows the dedicated group-claims configuration page that it cites. The implicit flow is no longer recommended for single-page applications.

The Graph guidance is correct and deliberately leaves operation selection to the application's needs. `getMemberObjects` is transitive; `/me` requires delegated permissions, while `/users/{id}/getMemberObjects` supports delegated and application permissions. A future concrete `transitiveMemberOf` example should follow `@odata.nextLink`; advanced filters and OData casts use an eventual-consistency index.

The assigned-group, filtering, app-role, immutable Object ID, tenant-scoping, token-audience, on-behalf-of, caching, revocation, and fail-closed recommendations are technically sound. The post does not pin product or SDK versions, and all five links in its Official Documentation section resolved to the intended Microsoft Learn pages during validation.
