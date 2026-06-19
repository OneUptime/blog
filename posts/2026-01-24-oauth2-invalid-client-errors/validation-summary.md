# Validation Summary: How to Fix 'Invalid Client' OAuth2 Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OAuth 2.0
- OAuth 2.0 Authorization Server Metadata
- OpenID Connect client authentication
- Python
- Requests
- PyJWT
- Token introspection

## Sources Consulted
- RFC 6749: The OAuth 2.0 Authorization Framework - https://datatracker.ietf.org/doc/html/rfc6749
- RFC 8414: OAuth 2.0 Authorization Server Metadata - https://datatracker.ietf.org/doc/html/rfc8414
- OpenID Connect Core 1.0, Client Authentication - https://openid.net/specs/openid-connect-core-1_0.html#ClientAuthentication
- RFC 7662: OAuth 2.0 Token Introspection - https://datatracker.ietf.org/doc/html/rfc7662
- PyJWT Usage Examples - https://pyjwt.readthedocs.io/en/latest/usage.html

## Issues Found
- The initial `client_secret_basic` example built the Basic header as `base64(client_id:client_secret)` without first applying `application/x-www-form-urlencoded` encoding to the client ID and secret. Updated the diagram and Python example to encode both values with `urllib.parse.quote_plus(..., safe="")` before Base64 encoding, matching RFC 6749 Section 2.3.1.
- The `private_key_jwt` diagram abbreviated `client_assertion_type` as `jwt-bearer`. Updated it to the full required value, `urn:ietf:params:oauth:client-assertion-type:jwt-bearer`, as specified by OpenID Connect Core.
- The unsupported grant type example used `invalid_client`. For an authenticated client that is not authorized to use a grant type, RFC 6749 Section 5.2 defines `unauthorized_client`. Updated the diagnosis example and corresponding error check.
- The later URL-encoding examples used generic percent quoting. Updated them to `quote_plus` so the examples align more directly with `application/x-www-form-urlencoded` encoding.

## Review Notes
The examples are illustrative and provider behavior can vary. Some identity providers may return provider-specific descriptions or use `invalid_client` for broader client configuration failures, but the corrected examples now reflect the standard OAuth 2.0 error semantics and encoding rules.
