# Validation Summary: How to Fix 'Invalid Signature' JWT Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- JSON Web Token (JWT)
- JSON Web Signature (JWS)
- JSON Web Key Set (JWKS)
- Node.js
- jsonwebtoken
- jwks-rsa
- Node.js Buffer and crypto APIs

## Sources Consulted
- RFC 7519: JSON Web Token (JWT): https://datatracker.ietf.org/doc/html/rfc7519
- RFC 7515: JSON Web Signature (JWS): https://www.rfc-editor.org/rfc/rfc7515
- RFC 7518: JSON Web Algorithms (JWA): https://datatracker.ietf.org/doc/html/rfc7518
- jsonwebtoken official README: https://github.com/auth0/node-jsonwebtoken
- jwks-rsa official README: https://github.com/auth0/node-jwks-rsa
- Node.js Buffer documentation: https://nodejs.org/api/buffer.html
- Node.js crypto documentation: https://nodejs.org/api/crypto.html

## Issues Found
- The base64-secret example used `token` without defining it. Added a token signed with the decoded secret bytes so the example is complete and matches the described failure mode.
- The base64-secret guidance was too absolute. Updated the wording to clarify that base64 decoding is correct when the issuer documents that the secret is base64-encoded random bytes.
- The secret normalization comments implied special characters need special escaping. Clarified that ordinary UTF-8 secrets with special characters can be used as-is.
- The JWKS example said `crypto.createPublicKey({ key, format: 'jwk' })` converts a JWK to PEM. It returns a Node.js `KeyObject`, so the comment was corrected.
- The JWT debugger usage example declared `const debugger`, which is invalid JavaScript because `debugger` is a reserved keyword. Renamed it to `jwtDebugger`.
- The JWT debugger usage example used top-level `await` in a CommonJS-style snippet. Wrapped the usage in an async IIFE.
- The `jwks-rsa` example used an older callback-style `getSigningKey` pattern while the current official README documents promise usage. Updated it to `await this.jwksClient.getSigningKey(kid)`.

## Review Notes
All JavaScript code blocks were syntax-checked after the edits. The examples are illustrative and still require real secrets, keys, JWKS endpoints, and installed dependencies to run in an application.
