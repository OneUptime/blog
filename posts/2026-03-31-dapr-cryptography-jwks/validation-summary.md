# Validation Summary: How to Use Dapr Cryptography with JSON Web Key Sets (JWKS)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Cryptography building block
- JSON Web Key Sets (JWKS) / RFC 7517
- Dapr Python SDK (`dapr-client`)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- PyJWT (`pyjwt`)
- Flask (Python)
- node-jose-tools CLI
- OpenSSL

## Sources Consulted
- Dapr JWKS Cryptography component reference: https://docs.dapr.io/reference/components-reference/supported-cryptography/json-web-key-sets/
- Dapr Python SDK source (crypto client): https://github.com/dapr/python-sdk/blob/main/dapr/clients/grpc/client.py
- Dapr Go SDK crypto API: https://github.com/dapr/go-sdk/blob/main/client/crypto.go
- node-jose-tools npm package: https://www.npmjs.com/package/node-jose-tools
- PyJWT source (RSAAlgorithm.from_jwk): https://github.com/jpadilla/pyjwt/blob/master/jwt/algorithms.py
- RFC 7517 (JSON Web Key): https://datatracker.ietf.org/doc/html/rfc7517

## Issues Found

1. **Wrong component metadata field names (JWKS URL config)**: `jwksEndpoint` is not a valid Dapr JWKS component metadata field. Changed to `jwks`, which is the correct field name that accepts a URL, file path, or inline JSON. Also changed `cacheTTL` to `minRefreshInterval`, which is the actual field name in the Dapr JWKS component spec.

2. **Wrong component metadata field name (local JWKS config)**: `localKeys` is not a valid field. The Dapr JWKS component uses a single `jwks` metadata field for both URL-based and inline key scenarios. Changed `localKeys` to `jwks`.

3. **Wrong node-jose-tools subcommand**: `jose key-gen` does not exist. The correct subcommand is `jose newkey`. Changed `jose key-gen` to `jose newkey`.

4. **Incorrect Dapr Python SDK encrypt API usage**: The code had multiple errors:
   - Used `io.BytesIO(data)` for the `data` parameter; the SDK accepts `str` or `bytes` directly.
   - Used a plain dict for `options`; the SDK requires an `EncryptOptions` object from `dapr.clients.grpc._crypto`.
   - Used camelCase field names (`componentName`, `keyName`, `keyWrapAlgorithm`); the SDK uses snake_case (`component_name`, `key_name`, `key_wrap_algorithm`).
   - Used `RS256` as the `keyWrapAlgorithm`; RS256 is a signing algorithm (RSASSA-PKCS1-v1_5 with SHA-256), not a key wrapping algorithm. Changed to `RSA-OAEP-256`.
   - Section title said "Signing Data" but the code performed encryption. Changed title to "Encrypting Data" and renamed the function accordingly.

5. **Wrong Go SDK struct name**: `dapr.DecryptRequestOptions` does not exist. The correct struct is `dapr.DecryptOptions`. Changed accordingly.

6. **Unnecessary `json.dumps()` in PyJWT call**: `jwt.algorithms.RSAAlgorithm.from_jwk()` accepts both a JSON string and a dict directly. The `json.dumps(key_data)` wrapper was unnecessary and the code was also missing an `import json` statement. Simplified to pass the dict directly: `from_jwk(key_data)`.

## Review Notes
- The "Verifying with the Public JWKS Endpoint" section uses PyJWT directly (not Dapr) to verify JWTs. This is technically valid and a common pattern, but readers should understand this bypasses Dapr's cryptography building block.
- The Go SDK example ignores the error from `dapr.NewClient()`. While acceptable for a brief example, production code should handle this error.
- The Flask JWKS endpoint example is minimal and functional but lacks HTTPS, CORS headers, and cache-control headers that a production JWKS endpoint would need.
