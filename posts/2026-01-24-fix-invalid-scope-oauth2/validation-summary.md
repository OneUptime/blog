# Validation Summary: How to Fix 'Invalid Scope' OAuth2 Errors

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OAuth 2.0
- OpenID Connect
- Python
- Google OAuth 2.0 scopes
- GitHub OAuth app scopes
- Microsoft identity platform / Microsoft Graph scopes
- Facebook Login permissions

## Sources Consulted
- RFC 6749: The OAuth 2.0 Authorization Framework: https://datatracker.ietf.org/doc/html/rfc6749
- OpenID Connect Core 1.0: https://openid.net/specs/openid-connect-core-1_0.html
- Google OAuth 2.0 scopes for Google APIs: https://developers.google.com/identity/protocols/oauth2/scopes
- Google OAuth 2.0 authorization documentation: https://developers.google.com/identity/protocols/oauth2
- Google Cloud token types and tokeninfo introspection: https://docs.cloud.google.com/docs/authentication/token-types
- GitHub OAuth app scopes: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
- Microsoft identity platform scopes and permissions: https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc
- Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference
- Meta Facebook Login manual flow documentation: https://developers.facebook.com/documentation/facebook-login/guides/advanced/manual-flow
- Meta Facebook Login permissions documentation: https://developers.facebook.com/documentation/facebook-login/guides/permissions

## Issues Found
- The Google Admin SDK scope example used `admin.directory.user.readonly` without Google's required URL-style scope prefix. Changed it to `https://www.googleapis.com/auth/admin.directory.user.readonly` and clarified that it requires Google Workspace/admin setup and app verification.
- The Google helper removed duplicates with `list(set(scopes))`, which does not preserve order even though the usage comment showed a stable ordered result. Changed it to `list(dict.fromkeys(scopes))`.
- The "Checking Google Scope Validity" example implied that Google's `tokeninfo` endpoint validates arbitrary requested scopes before authorization. That endpoint introspects issued tokens; it is not a pre-authorization scope validator. Renamed the example to "Checking Google Scope Format", removed the unused endpoint/import, and described it as a basic format sanity check.
- The provider-agnostic manager marked Microsoft scopes as case-insensitive and lowercased them. OAuth 2.0 scope strings are case-sensitive, and Microsoft Graph permission names are documented with specific casing. Changed Microsoft to case-sensitive and removed the lowercasing behavior.

## Review Notes
The remaining examples are illustrative snippets rather than complete runnable applications; several Flask variables and helper functions are intentionally assumed to exist in surrounding application code. The Google scope format checker only catches obvious formatting mistakes and should not be treated as a substitute for checking the official Google scope list or handling provider errors.
