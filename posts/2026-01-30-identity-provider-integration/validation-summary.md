# Validation Summary: How to Build Identity Provider Integration

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OAuth 2.0 Authorization Code flow
- OpenID Connect
- PKCE
- JWT ID token validation
- JWKS
- Node.js / Express-style JavaScript
- `jsonwebtoken`
- `jwks-rsa`
- Server-side sessions and refresh tokens

## Sources Consulted
- OAuth 2.0 Authorization Framework, RFC 6749: https://datatracker.ietf.org/doc/html/rfc6749
- Proof Key for Code Exchange, RFC 7636: https://datatracker.ietf.org/doc/html/rfc7636
- OAuth 2.0 Security Best Current Practice, RFC 9700: https://datatracker.ietf.org/doc/rfc9700/
- OpenID Connect Core 1.0: https://openid.net/specs/openid-connect-core-1_0.html
- Node.js Buffer encoding documentation: https://nodejs.org/api/buffer.html
- `jsonwebtoken` README: https://github.com/auth0/node-jsonwebtoken/blob/master/README.md
- `jwks-rsa` examples and caching documentation: https://github.com/auth0/node-jwks-rsa/blob/master/EXAMPLES.md
- OneUptime linked blog posts, verified reachable:
  - https://oneuptime.com/blog/post/2025-08-19-sso-is-a-security-basic-not-an-enterprise-perk/view
  - https://oneuptime.com/blog/post/2025-11-20-secure-your-status-page-authentication-options/view

## Issues Found
- The benefits table said IdP deprovisioning "happens instantly." That is too absolute for an OIDC application with local sessions, because centralized IdP changes still need to be enforced by application session, token, or provisioning behavior. Changed it to "deprovisioning can be enforced centrally."
- The callback example did not store `refresh_token`, but the later refresh middleware depended on `req.session.refreshToken`. Updated the callback to save the refresh token when the token response includes one.
- The refresh middleware decoded the access token as a JWT to inspect `exp`. OAuth access tokens are not guaranteed to be JWTs; they can be opaque. Updated the example to use the token endpoint's `expires_in` value to compute and store `accessTokenExpiresAt` instead.
- The refresh middleware now updates `accessTokenExpiresAt` after refresh when the provider returns a new `expires_in` value.

## Review Notes
The ID token verification example correctly validates signature, issuer, audience, and expiration through `jsonwebtoken`; its explicit `exp` check is redundant because `jwt.verify` already validates expiration by default, but it is not technically incorrect. In a production implementation, consider adding provider discovery, nonce validation when a nonce is sent, rate limiting for JWKS lookups, and tenant-aware issuer/audience validation for the multi-IdP version.
