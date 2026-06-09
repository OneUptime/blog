# Validation Summary: How to Create and Sign JWTs

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- JSON Web Tokens (JWT) — structure, claims, signing algorithms (HS256/384/512, RS256/384/512, ES256/384/512, PS256)
- Node.js `jsonwebtoken` library (symmetric and RSA signing)
- Node.js built-in `crypto` module (HMAC, RSA key generation, Base64URL encoding)
- Python `PyJWT` library
- Python `cryptography` library (RSA key generation, PEM serialization)
- Go `github.com/golang-jwt/jwt/v5` library
- Mermaid diagrams (flowchart and sequence)

## Sources Consulted
- RFC 7519 (JSON Web Token) — https://datatracker.ietf.org/doc/html/rfc7519
- RFC 7518 (JSON Web Algorithms) — algorithm/curve mappings for HS*, RS*, ES*, PS*
- `node-jsonwebtoken` README — https://github.com/auth0/node-jsonwebtoken (verified `sign` options: `algorithm`, `expiresIn`, `issuer`, `audience`, `jwtid`, `keyid`; `decode` `{ complete: true }` shape; `verify` options)
- PyJWT documentation — https://pyjwt.readthedocs.io/en/stable/usage.html (encode/decode signatures; `headers={'kid': ...}`; datetime handling)
- Python `cryptography` RSA docs — https://cryptography.io/en/latest/hazmat/primitives/asymmetric/rsa/ (`backend` parameter no longer required since cryptography 3.1)
- Python 3.12 release notes — deprecation of `datetime.datetime.utcnow()`
- `golang-jwt/jwt/v5` pkg.go.dev — https://pkg.go.dev/github.com/golang-jwt/jwt/v5 (verified `RegisteredClaims` fields, `NewNumericDate`, `NewWithClaims`, `ParseWithClaims`, parser options `WithValidMethods`, `WithIssuer`, `WithAudience`, `WithExpirationRequired`)
- Node.js `crypto` documentation — `generateKeyPairSync`, `createHmac`, Buffer `base64url` encoding

## Issues Found
1. **Python: deprecated `datetime.datetime.utcnow()`** — The Python example used `datetime.datetime.utcnow()` in three places (`now`, `exp`, `iat`). This method emits a `DeprecationWarning` in Python 3.12+ (released October 2023). Replaced all three occurrences with timezone-aware `datetime.datetime.now(datetime.timezone.utc)`, which is the recommended modern equivalent. PyJWT correctly handles both naive and timezone-aware datetimes, so behavior is preserved while removing the deprecation.

2. **Python: unnecessary `default_backend()` import and argument** — The Python example imported `from cryptography.hazmat.backends import default_backend` and passed `backend=default_backend()` to `rsa.generate_private_key(...)`. The `backend` parameter has been optional since `cryptography` 3.1 (2020), and `default_backend()` is effectively a no-op today. Removed the import and the `backend=` argument to align with the current recommended usage.

## Review Notes
- All Node.js `jsonwebtoken` API usage (sign/verify/decode options including `algorithm`, `expiresIn`, `issuer`, `audience`, `jwtid`, `keyid`, `algorithms`) verified against the upstream library.
- All Go `golang-jwt/jwt/v5` API usage verified, including `RegisteredClaims` field names, `NewNumericDate`, `NewWithClaims`, `ParseWithClaims`, and parser options. Note that `jwt.WithAudience` is variadic (`...string`); the post passes a single string, which is correct.
- JWT algorithm/curve mappings are correct — including the commonly confused ES512 = ECDSA + P-521 + SHA-512 (curve is P-521, not P-512).
- Manual JWT construction example using `crypto.createHmac('sha256', ...)` and Base64URL encoding is correct and produces a valid JWT.
- Security guidance (algorithm allow-listing to prevent algorithm-confusion / `none`-algorithm attacks, ≥256-bit HMAC secrets per RFC 7518 §3.2, validating `iss` and `aud`, short-lived access tokens with refresh, `httpOnly`/`secure`/`sameSite` cookies) all aligns with current OWASP/RFC guidance.
- Minor style note (not corrected, as it is not a technical error): the Go `generateTokenID` helper ignores the error return from `rand.Read`. `crypto/rand.Read` is documented to always succeed on supported platforms, so this is acceptable, but production code commonly checks the error.
- Minor style note (not corrected): in the Node.js HS256 example, `Math.random().toString(36)` is used for token ID entropy. The text correctly does not claim cryptographic strength for that helper, and a separate `jti` could be generated via `crypto.randomUUID()` for stronger uniqueness — left as-is since the post is not making a security claim about that specific helper.
