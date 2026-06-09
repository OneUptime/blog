# Validation Summary: How to Understand JWT Structure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- JSON Web Tokens (JWT) — RFC 7519
- JSON Web Algorithms (JWA) — RFC 7518
- base64url encoding (RFC 4648 Section 5)
- HMAC-SHA256 / SHA-384 / SHA-512
- RSA (RS256/RS384/RS512) and ECDSA (ES256/ES384/ES512) signing
- Node.js `crypto` module and `jsonwebtoken` library
- Python `PyJWT` library, Flask
- Go `golang-jwt/jwt/v5` library

## Sources Consulted
- RFC 7519 (JSON Web Token): https://www.rfc-editor.org/rfc/rfc7519
- RFC 7518 (JSON Web Algorithms): https://www.rfc-editor.org/rfc/rfc7518
- RFC 4648 (base64/base64url encoding): https://www.rfc-editor.org/rfc/rfc4648
- `jsonwebtoken` npm package docs: https://github.com/auth0/node-jsonwebtoken
- PyJWT documentation: https://pyjwt.readthedocs.io/
- `golang-jwt/jwt/v5` documentation: https://pkg.go.dev/github.com/golang-jwt/jwt/v5
- Python 3.12 release notes (deprecation of `datetime.utcnow()`): https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- Node.js `crypto.createHmac()` docs: https://nodejs.org/api/crypto.html#cryptocreatehmacalgorithm-key-options
- MDN `atob()` reference: https://developer.mozilla.org/en-US/docs/Web/API/Window/atob

## Issues Found

### 1. Deprecated Python API: `datetime.datetime.utcnow()`
- **Where:** Section 7, "Python with PyJWT" example.
- **What was wrong:** The code used `datetime.datetime.utcnow()` to set `iat` and to compute `exp`. This function has been deprecated since Python 3.12 in favor of timezone-aware `datetime.datetime.now(datetime.timezone.utc)`. Code that uses `utcnow()` will emit a `DeprecationWarning` on modern Python versions and is scheduled for removal in a future release.
- **Fix:** Replaced both `datetime.datetime.utcnow()` calls with a single timezone-aware `datetime.datetime.now(datetime.timezone.utc)` value (`now`) and used it for both `iat` and as the base for the `expiration` calculation. Added a short comment noting the deprecation. PyJWT accepts timezone-aware `datetime` objects for `iat`/`exp` and converts them to UNIX timestamps internally, so the change is functionally equivalent (and correct under PyJWT 2.x+).

## Review Notes
- The illustrative JWT-creation code in Section 6 uses `crypto.createHmac('sha256', secret).update(input).digest('base64')` followed by base64url substitutions. This is correct and produces a valid base64url-encoded HMAC. Newer Node.js versions also support `.digest('base64url')` directly, which would avoid the post-processing — that could be a future stylistic improvement but the current code is correct.
- The browser `atob()` example in Section 3 omits base64 padding restoration. It works for the specific demonstration token (header length is a multiple of 4) but can throw `InvalidCharacterError` for headers/payloads whose base64url-decoded length is not a multiple of 4. This is acceptable for an explanatory snippet but worth keeping in mind in production code.
- `atob()` returns a Latin-1 binary string; for JWTs that contain non-ASCII characters in claims, the snippet would produce mojibake. Standard JWT headers are ASCII so this works for the shown example.
- The list of `alg` values in Section 3 is described as "common" — it omits PS256/PS384/PS512 (RSASSA-PSS) and EdDSA (RFC 8037), which is acceptable for an introductory guide.
- Registered claims listed in Section 4 match RFC 7519 Section 4.1 exactly.
- `jsonwebtoken` error class names (`TokenExpiredError`, `JsonWebTokenError`, `NotBeforeError`) and PyJWT exception classes (`ExpiredSignatureError`, `InvalidIssuerError`, `InvalidAudienceError`, `InvalidTokenError`) are all current and accurate.
- The Go example uses `github.com/golang-jwt/jwt/v5` with `RegisteredClaims`, `ClaimStrings`, `NewNumericDate`, `SigningMethodHS256`, and `NewWithClaims` — all correct for v5.
- The Flask example references `@app.route` without showing a `Flask(__name__)` instantiation; this is typical for snippet-style examples and not a technical error.
