# Validation Summary: How to Fix 'Invalid Request' OAuth2 Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OAuth 2.0
- OpenID Connect
- JavaScript
- URLSearchParams
- PKCE

## Sources Consulted
- RFC 6749: The OAuth 2.0 Authorization Framework: https://datatracker.ietf.org/doc/html/rfc6749
- RFC 9700: Best Current Practice for OAuth 2.0 Security: https://datatracker.ietf.org/doc/rfc9700/
- OpenID Connect Core 1.0: https://openid.net/specs/openid-connect-core-1_0.html
- WHATWG URL Standard: https://url.spec.whatwg.org/
- MDN URLSearchParams documentation: https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams

## Issues Found
- The authorization-code example described `redirect_uri`, `scope`, and `state` as required parameters. Updated the wording and comments to reflect that OAuth 2.0 requires `client_id` and `response_type`, `redirect_uri` is required in common/provider-specific cases and when multiple or partial redirect URIs are registered, `scope` is optional in OAuth 2.0 but required for OpenID Connect, and `state` is recommended for CSRF protection.
- The token-exchange example described all listed parameters as required. Updated comments to reflect RFC 6749 requirements: `redirect_uri` is required if it was used in the authorization request, and `client_id` is required when the client is not otherwise authenticating.
- The URL encoding example said `URLSearchParams` serializes a space as `%20`. Updated the expected result to `scope=openid+profile`, matching the WHATWG URL Standard and Node/browser behavior.
- The grant-type matrix and diagram treated `redirect_uri` and `client_id` as unconditionally required for `authorization_code`. Updated them to show these as conditional.
- The response type validation list omitted the OpenID Connect `id_token token` and `code id_token token` response type combinations. Added them to avoid falsely flagging valid OIDC response types.
- The debugging checklist example expected `redirect_uri` to be reported as missing. Updated the expected output because the checklist now treats `redirect_uri` as conditional instead of always required.

## Review Notes
- The post remains intentionally provider-agnostic. Real OAuth providers often impose stricter requirements than RFC 6749, especially around exact redirect URI registration, PKCE, and client authentication methods.
- RFC 9700 discourages implicit-flow response types that return access tokens from the authorization endpoint. The post still mentions them only in validation examples, not as a recommendation.
