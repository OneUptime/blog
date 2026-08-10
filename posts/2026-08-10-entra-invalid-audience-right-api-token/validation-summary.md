# Validation Summary: `Invalid Audience` in Entra: Requesting a Token for the Right API

## Status
validated

## Post Type
Technical guide / troubleshooting reference

## Technologies Covered
- Microsoft Entra ID
- OAuth 2.0 and OpenID Connect
- Access tokens and ID tokens
- Audience, issuer, scope, and role validation
- Microsoft Graph
- Custom web APIs
- OAuth 2.0 client credentials flow
- OAuth 2.0 authorization code flow
- OAuth 2.0 on-behalf-of flow
- Microsoft Authentication Library (MSAL) token caching

## Sources Consulted
- Microsoft Learn, Access tokens in the Microsoft identity platform: https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
- Microsoft Learn, Scopes and permissions in the Microsoft identity platform: https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc
- Microsoft Learn, Access token claims reference: https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference
- Microsoft Learn, ID tokens in the Microsoft identity platform: https://learn.microsoft.com/en-us/entra/identity-platform/id-tokens
- Microsoft Learn, OAuth 2.0 client credentials flow: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow
- Microsoft Learn, OAuth 2.0 authorization code flow: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- Microsoft Learn, OAuth 2.0 on-behalf-of flow: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow
- Microsoft Learn, Configure an application to expose a web API: https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-configure-app-expose-web-apis
- Microsoft Learn, Protected web API—verify scopes and app roles: https://learn.microsoft.com/en-us/entra/identity-platform/scenario-protected-web-api-verification-scope-app-roles
- Microsoft Learn, Acquire and cache tokens using MSAL: https://learn.microsoft.com/en-us/entra/identity-platform/msal-acquire-cache-tokens
- RFC 6750, OAuth 2.0 Bearer Token Usage: https://www.rfc-editor.org/rfc/rfc6750.html
- RFC 8707, Resource Indicators for OAuth 2.0: https://www.rfc-editor.org/rfc/rfc8707.html

## Issues Found
- The `.default` explanation implied that it only uses permissions already configured and granted. Clarified that it requests a token for the named resource using permissions granted for that resource and, in interactive flows, can trigger consent for configured required permissions.
- The client-credentials section stated that every custom API must expose and assign an application permission. Microsoft Entra also supports an API-maintained ACL with role-less app-only tokens, so the requirement was made conditional on using application permissions and the app-role assignment/admin-consent wording was separated.
- The ID-token example guaranteed an audience-mismatch response. That is typical with separate client and API registrations, but a shared registration can produce matching audience values and middleware can report a different validation failure. Changed the text to require rejection in all cases and identify audience failure specifically for separate registrations.
- The diagnostic workflow assumed every access token could be decoded. Restricted claim inspection to decodable JWTs issued for APIs the developer owns and added the documented fallback of using requested scopes and token-response metadata for opaque tokens.
- The cache guidance described a universal external cache key and could be read as conflicting with supported MSAL cache partitioning. Changed it to use the authentication library's documented token cache and warned specifically against an application-level cache that maps one user to one raw access token. The cache-clearing diagnostic was likewise limited to custom application-level caches.
- The on-behalf-of wording could be read as forbidding API A from using its incoming token as the assertion at the Entra token endpoint. Clarified that API A must not forward that token directly to API B and must exchange it for an API-B token.
- The post stated that ID tokens and access tokens always have different audiences. A shared app registration can make the audience values coincide, so the text now distinguishes them by protocol purpose and validation requirements instead.

## Review Notes
The HTTP client-credentials request, scope formats, URL encoding, Microsoft Graph default-resource behavior, token-version discussion, separate-token requirement, issuer/tenant guidance, and linked URLs were verified as current. For v2.0 access tokens, `aud` is the API's application (client) ID; for v1.0 access tokens, it can be the client ID or requested resource URI, as the post correctly notes at a high level. Current Microsoft documentation says `.default` is required for OBO while its OBO protocol example still shows a specific Graph scope; the post's qualified “where required” guidance remains consistent with the explicit `.default` documentation.
