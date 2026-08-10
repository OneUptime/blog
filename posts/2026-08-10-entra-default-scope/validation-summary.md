# Validation Summary: What Does the `.default` Scope Mean in Microsoft Entra ID?

## Status
validated

## Post Type
Technical guide and reference

## Technologies Covered

- Microsoft Entra ID
- Microsoft identity platform OAuth 2.0 endpoints
- OAuth 2.0 scopes and OpenID Connect scopes
- The Microsoft-specific `.default` scope
- Delegated permissions and application permissions (app roles)
- Client credentials and on-behalf-of flows
- Microsoft Graph and custom web APIs
- Consent grants, service principals, and token claims

## Sources Consulted

- [Scopes and permissions in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc)
- [OAuth 2.0 client credentials flow on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [Acquire tokens to call a web API using a daemon application](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-daemon-acquire-token)
- [Developer's guide to requesting permissions and consent](https://learn.microsoft.com/en-us/entra/identity-platform/consent-types-developer)
- [Overview of permissions and consent in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview)
- [Microsoft identity platform and OAuth 2.0 on-behalf-of flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow)
- [Acquire a token for a web API that calls web APIs](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-web-api-call-api-acquire-token)
- [Access tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
- [Verify scopes and app roles in a protected web API](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-protected-web-api-verification-scope-app-roles)
- [Grant an app-role assignment to a service principal](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-post-approleassignedto?view=graph-rest-1.0)
- [OAuth 2.0 Authorization Framework (RFC 6749)](https://www.rfc-editor.org/rfc/rfc6749.html)

## Issues Found

- The opening definition incorrectly tied every `.default` token's contents to the permissions currently listed in the app registration. In delegated flows, existing grants for the target resource and signed-in user determine the scopes in the token, while the statically configured required permissions determine what an interactive `.default` consent prompt requests. The opening, the “What Default Does Not Mean” section, the static-consent explanation, and the conclusion were corrected to distinguish token contents from consent behavior.
- The post stated categorically that `.default` is required for every on-behalf-of request. Microsoft's general scopes page says this, but its flow-specific OBO protocol and token-acquisition documentation show requests using explicit delegated scopes. The two categorical statements were changed to say that `.default` is supported in OBO and is appropriate when the OBO/static-consent design calls for it. The valid OBO `.default` example was retained.
- The wrong-audience troubleshooting item asserted that the resource prefix must be wrong. A wrong audience can also involve use of the wrong token or an incorrect expected audience at the API. The guidance now tells readers to verify both the requested target resource and the API's expected audience.

## Review Notes

Microsoft's current documentation is internally inconsistent about whether `.default` is universally required for OBO: the general scopes page says it is required, while the dedicated OBO pages demonstrate explicit delegated-scope requests. The revised post states only the behavior supported by both sets of documentation. App-only tokens can also intentionally omit `roles` when a custom API uses ACL-based authorization and does not require assignment; the post correctly warns that successful token issuance alone does not prove that a role is present. All six links in the post's Official Documentation section resolved to the expected current pages.
