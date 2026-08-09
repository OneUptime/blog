# Validation Summary: ID Token vs Access Token in OIDC: Which Token Belongs in Your API Authorization Header?

## Status
validated

## Post Type
Technical reference / API security guide

## Technologies Covered
- OpenID Connect Core 1.0
- OAuth 2.0
- ID tokens and JSON Web Tokens (JWTs)
- OAuth access tokens: bearer, opaque, JWT, and sender-constrained tokens
- OAuth 2.0 Token Introspection
- OAuth 2.0 Resource Indicators
- OAuth 2.0 Token Exchange
- Mutual TLS (mTLS) certificate-bound access tokens
- Demonstrating Proof of Possession (DPoP)

## Sources Consulted
- OpenID Connect Core 1.0 incorporating errata set 2: https://openid.net/specs/openid-connect-core-1_0.html
- OpenID Connect Discovery 1.0: https://openid.net/specs/openid-connect-discovery-1_0.html
- RFC 6749, The OAuth 2.0 Authorization Framework: https://www.rfc-editor.org/rfc/rfc6749.html
- RFC 6750, OAuth 2.0 Bearer Token Usage: https://www.rfc-editor.org/rfc/rfc6750.html
- RFC 7662, OAuth 2.0 Token Introspection: https://www.rfc-editor.org/rfc/rfc7662.html
- RFC 8414, OAuth 2.0 Authorization Server Metadata: https://www.rfc-editor.org/rfc/rfc8414.html
- RFC 8693, OAuth 2.0 Token Exchange: https://www.rfc-editor.org/rfc/rfc8693.html
- RFC 8705, OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens: https://www.rfc-editor.org/rfc/rfc8705.html
- RFC 8707, Resource Indicators for OAuth 2.0: https://www.rfc-editor.org/rfc/rfc8707.html
- RFC 8725, JSON Web Token Best Current Practices: https://www.rfc-editor.org/rfc/rfc8725.html
- RFC 9068, JWT Profile for OAuth 2.0 Access Tokens: https://www.rfc-editor.org/rfc/rfc9068.html
- RFC 9449, OAuth 2.0 Demonstrating Proof of Possession (DPoP): https://www.rfc-editor.org/rfc/rfc9449.html
- RFC 9700, Best Current Practice for OAuth 2.0 Security: https://www.rfc-editor.org/rfc/rfc9700.html

## Issues Found
- The warning about non-portable `audience` request parameters did not mention that RFC 8693 standardizes `audience` specifically for token-exchange requests. I clarified that provider-specific `audience` parameters are not portable in ordinary authorization and token requests while RFC 8693 defines the parameter for token exchange, and I added RFC 8693 to the post's official documentation list.

## Review Notes
The HTTP request and JSON examples are syntactically valid. The example `iat` and `exp` values correspond to 2026-08-09 06:10 UTC and 07:10 UTC, respectively, giving a coherent one-hour lifetime. All documentation and author links resolve to the intended destinations. RFC 6750 normally associates `invalid_token` with HTTP 401 and `insufficient_scope` with HTTP 403; the troubleshooting checklist does not prescribe response status codes, so no correction was required. The ID-token validation discussion is a concise overview; complete implementations must also apply all flow- and profile-specific OpenID Connect checks through maintained libraries.
