# Validation Summary: How to Fix 'Key Not Found' JWT Verification Errors

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- JSON Web Tokens (JWT)
- JSON Web Key Sets (JWKS) and JSON Web Keys (JWK)
- PyJWT
- HTTPX async client
- Python asyncio
- RSA, ECDSA, and RSASSA-PSS JWT algorithms
- pytest and unittest.mock

## Sources Consulted
- PyJWT API Reference: https://pyjwt.readthedocs.io/en/stable/api.html
- PyJWT Usage Examples: https://pyjwt.readthedocs.io/en/latest/usage.html
- HTTPX Developer Interface: https://www.python-httpx.org/api/
- HTTPX QuickStart / Timeouts: https://www.python-httpx.org/quickstart/
- RFC 7517, JSON Web Key (JWK): https://datatracker.ietf.org/doc/html/rfc7517
- RFC 7515, JSON Web Signature (JWS): https://www.rfc-editor.org/rfc/rfc7515
- pytest fixture documentation: https://docs.pytest.org/en/stable/how-to/fixtures.html

## Issues Found
- The header inspection example imported unused modules and annotated `analyze_header()` as returning `Dict[str, str]` even though it returns lists of strings. Removed unused imports and corrected the return type.
- The asymmetric algorithm handling discussed PS algorithms in the diagram but omitted `PS256`, `PS384`, and `PS512` from the Python examples. Added PS algorithms to the relevant allow lists.
- The PyJWT verification examples used `algorithms=[alg]`, deriving the decode algorithm list from the unverified token header. PyJWT warns that allowed algorithms should be hard-coded or configured with the key. Updated the examples to pass configured allow lists while still rejecting headers outside those lists.
- The key rotation handler used `RSAAlgorithm`, `json`, and `logger` without importing or defining them in that snippet. Added the missing imports and logger initialization.
- The multi-algorithm verifier did not explicitly reject asymmetric tokens with no `kid` before key lookup. Added the missing validation.
- The test examples used `AsyncMock` for synchronous HTTPX response methods and placeholder RSA modulus values that would fail JWK parsing. Replaced response mocks with `Mock` and patched `_jwk_to_key()` so the tests focus on cache and lookup behavior rather than invalid placeholder cryptographic material.

## Review Notes
The custom JWKS client is educational, but PyJWT also provides `PyJWKClient` with JWKS fetching, caching, and refresh behavior. The article's custom implementation remains valid for explaining key-management mechanics and multi-source behavior.
