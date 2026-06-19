# Validation Summary: How to Fix 'Token Revoked' OAuth2 Errors

## Status
validated

## Post Type
Guide

## Technologies Covered
- OAuth 2.0
- OAuth 2.0 Bearer tokens
- OAuth 2.0 token revocation
- GitHub REST API authentication
- Microsoft Entra ID refresh tokens
- Python
- Flask

## Sources Consulted
- RFC 6750: OAuth 2.0 Bearer Token Usage: https://datatracker.ietf.org/doc/html/rfc6750
- RFC 7009: OAuth 2.0 Token Revocation: https://datatracker.ietf.org/doc/html/rfc7009
- GitHub REST API authentication documentation: https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api
- Microsoft identity platform refresh token documentation: https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens
- Microsoft Entra ID AADSTS50173 troubleshooting documentation: https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50173-grant-expired-revoked
- Python functools documentation: https://docs.python.org/3/library/functools.html
- Flask flashing and API documentation: https://flask.palletsprojects.com/en/stable/patterns/flashing/ and https://flask.palletsprojects.com/en/stable/api/

## Issues Found
- The introduction said revoked tokens cannot be refreshed and always require re-authentication. This was too broad because an expired or revoked access token is different from a revoked refresh token or revoked authorization grant. Updated the wording to say that revoked refresh tokens or revoked underlying grants cannot be used to obtain new access tokens and require re-authentication.
- The "Standard OAuth2" error example used a JSON body for a bearer-token resource error. RFC 6750 defines bearer-token errors in the `WWW-Authenticate` header, so the example was changed to a header-style value.
- The Microsoft Azure AD example used an `AADSTS70000` revoked-token message. Microsoft documents the revoked-grant scenario as `AADSTS50173`, so the example was updated and the provider name was changed to Microsoft Entra ID.
- The detection logic treated all `invalid_token`, `invalid_grant`, `access_denied`, and generic `unauthorized` responses as revoked-token errors. This was inaccurate because those errors can also mean expired, malformed, insufficient, or otherwise invalid credentials. The logic now looks for revocation-specific text or provider-specific revoked-grant indicators.
- The Flask-style handler example used `session`, `flash`, `redirect`, and `url_for` without importing them. Added the corresponding Flask imports.

## Review Notes
The GitHub `Bad credentials` response can indicate an invalid or revoked credential, but GitHub's generic response does not prove revocation by itself. The post now treats this as provider-specific detection rather than a protocol-level OAuth2 signal.
