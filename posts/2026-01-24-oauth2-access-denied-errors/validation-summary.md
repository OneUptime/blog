# Validation Summary: How to Fix 'Access Denied' OAuth2 Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OAuth 2.0 authorization code flow
- OAuth 2.0 authorization endpoint error handling
- OpenID Connect scopes
- Python
- Flask
- Microsoft Entra ID admin consent
- Microsoft Graph delegated permission grants
- Google OAuth 2.0 incremental authorization

## Sources Consulted
- RFC 6749: The OAuth 2.0 Authorization Framework: https://datatracker.ietf.org/doc/html/rfc6749
- Microsoft identity platform admin consent endpoint documentation: https://learn.microsoft.com/en-us/entra/identity-platform/v2-admin-consent
- Microsoft identity platform scopes and permissions documentation: https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc
- Microsoft Graph oAuth2PermissionGrant list documentation: https://learn.microsoft.com/en-us/graph/api/oauth2permissiongrant-list?view=graph-rest-1.0
- Google OAuth 2.0 for Web Server Applications documentation: https://developers.google.com/identity/protocols/oauth2/web-server
- Flask 3.1 documentation: https://flask.palletsprojects.com/en/stable/

## Issues Found
- The sequence diagram showed scope and client authorization failures as `access_denied (invalid_scope)` and `access_denied (unauthorized_client)`. RFC 6749 defines `access_denied`, `invalid_scope`, and `unauthorized_client` as separate authorization endpoint error codes, so the diagram was corrected to show `invalid_scope` and `unauthorized_client` directly.
- The invalid scope diagnosis example used `access_denied`. RFC 6749 defines `invalid_scope` for requested scopes that are invalid, unknown, or malformed, so the example was updated to use `invalid_scope`.
- The admin consent code block used `List[str]` without importing `List`. Added `from typing import List` so the snippet is syntactically complete.
- The redirect URI section stated that mismatched redirect URIs cause access denied errors. RFC 6749 says the authorization server must not automatically redirect to an invalid redirect URI, and these failures are typically surfaced as `invalid_request` or provider-specific redirect URI errors, so the wording was corrected.
- The redirect URI validator normalized away trailing slashes, making its own "trailing slash will fail" example incorrect and weakening OAuth redirect URI matching. The validator now compares full registered redirect URI strings exactly and uses closest-match logic only for diagnostics.

## Review Notes
The examples are illustrative and provider behavior can vary, especially for policy failures and enterprise consent messages. The post now distinguishes standards-defined OAuth error codes from provider-specific descriptions while preserving the original troubleshooting approach.
