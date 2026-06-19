# Validation Summary: How to Fix 'Invalid Token' OAuth2 Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OAuth 2.0 Bearer tokens
- JSON Web Tokens (JWT)
- JSON Web Signature (JWS)
- Node.js
- jsonwebtoken
- jwks-rsa
- Python
- PyJWT
- Mermaid diagrams

## Sources Consulted
- RFC 6750: OAuth 2.0 Bearer Token Usage: https://datatracker.ietf.org/doc/html/rfc6750
- RFC 7519: JSON Web Token (JWT): https://datatracker.ietf.org/doc/html/rfc7519
- RFC 7515: JSON Web Signature (JWS): https://datatracker.ietf.org/doc/html/rfc7515
- node-jsonwebtoken README: https://github.com/auth0/node-jsonwebtoken/blob/master/README.md
- node-jwks-rsa examples: https://github.com/auth0/node-jwks-rsa/blob/master/EXAMPLES.md
- PyJWT API documentation: https://pyjwt.readthedocs.io/en/stable/api.html
- PyJWT usage documentation: https://pyjwt.readthedocs.io/en/latest/usage.html

## Issues Found
- The JavaScript debugger stripped the `Bearer ` prefix only inside `checkFormat`, then decoded and verified the original token string. Added `normalizeToken()` and used the normalized token for format checks, decoding, and signature verification.
- The JavaScript header inspection called `alg.startsWith(...)` without checking whether `alg` existed. Added a guard so malformed headers do not throw during diagnostics.
- The JavaScript signature-only check still allowed `nbf` validation to fail. Added `ignoreNotBefore: true` alongside `ignoreExpiration`.
- The algorithm mismatch example described `jwt.verify(token, publicKey)` as accepting any algorithm. Current `jsonwebtoken` uses key-type-based defaults, so the text was corrected to say it relies on defaults rather than pinning the expected algorithm.
- The multi-algorithm key example returned the same `publicKey` for both RSA and ECDSA algorithms. Updated it to return algorithm-appropriate RSA and EC public keys.
- The JWKS debugging example used callback-style `getSigningKeys` behavior that does not match current `jwks-rsa` async examples. Replaced it with an explicit JWKS fetch for logging available key IDs.
- The error handler classified a malformed JWT access token as `invalid_request` with HTTP 400. RFC 6750 classifies malformed access tokens as `invalid_token` with HTTP 401, so the handler was corrected.
- The RFC 6750 links used the old `tools.ietf.org` URL. Updated them to the current IETF Datatracker URL.
- The Python debugger stripped `Bearer ` only inside `_check_format`, then decoded and verified the original token string. Added `_normalize_token()` and used the normalized token throughout diagnosis.
- The Python signature-only verification disabled expiration, issued-at, and not-before checks but not audience or issuer checks. Added `verify_aud: False` and `verify_iss: False` so the method verifies the signature as described.
- Removed unused `crypto` and `base64` imports from the JavaScript and Python snippets.

## Review Notes
The post focuses on JWT-formatted OAuth2 access tokens. OAuth2 bearer tokens can also be opaque reference tokens, so future revisions could briefly call out that these debugging techniques apply when the access token is a JWT.
