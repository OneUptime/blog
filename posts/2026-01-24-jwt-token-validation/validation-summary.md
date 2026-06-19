# Validation Summary: How to Handle JWT Token Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- JSON Web Tokens (JWT)
- OAuth 2.0 refresh tokens
- Node.js
- jsonwebtoken
- jwks-rsa
- Express
- Python
- PyJWT
- JWKS

## Sources Consulted
- RFC 7519: JSON Web Token (JWT): https://datatracker.ietf.org/doc/html/rfc7519
- RFC 8725: JSON Web Token Best Current Practices: https://datatracker.ietf.org/doc/html/rfc8725
- RFC 6749: The OAuth 2.0 Authorization Framework: https://datatracker.ietf.org/doc/html/rfc6749
- jsonwebtoken documentation: https://www.npmjs.com/package/jsonwebtoken
- jwks-rsa documentation: https://github.com/auth0/node-jwks-rsa
- PyJWT usage documentation: https://pyjwt.readthedocs.io/en/latest/usage.html
- PyJWT API reference: https://pyjwt.readthedocs.io/en/stable/api.html
- Node.js Buffer documentation: https://nodejs.org/api/buffer.html

## Issues Found
- The Node.js validator stripped a `Bearer ` prefix only inside `validateFormat`, then decoded and verified the original token. Updated `validateFormat` to return the normalized token and changed validation to decode and verify that normalized value.
- The Node.js and Python examples defaulted to allowing both HS256 and RS256. Updated defaults to choose one algorithm family based on configured key source, aligning with JWT best current practice guidance to use explicit algorithm allow-lists and avoid mixing symmetric and asymmetric algorithm families for a validator.
- The Node.js and Python signing-key helpers trusted the token header far enough to branch on an unsupported or missing `alg` before checking the configured allow-list. Added explicit configured-algorithm checks before key selection.
- The Node.js required-claim check used truthiness, which can misclassify present falsy values as missing. Updated it to check claim presence with `hasOwnProperty`.
- The Python validator claimed to support tokens with a `Bearer ` prefix but could raise a generic exception for missing or non-string tokens before validation. Added normalization and type checking before format validation.
- The Python example defined a `MISSING_CLAIM` error code but did not map PyJWT's missing-required-claim exception to it. Added a specific `MissingRequiredClaimError` handler.
- The OAuth refresh example sent `client_secret` in the request body by default. Updated the confidential-client path to use HTTP Basic authentication and retained a body `client_id` path for public clients without a secret.
- The security best-practices list recommended appropriate algorithms but did not mention keeping a fixed algorithm family per validator. Updated that item to reflect the corrected examples.

## Review Notes
The examples are intentionally broad and still omit some production hardening details, such as structured logging, token storage guidance, and provider-specific JWKS cache behavior. The current APIs used are not deprecated in the consulted documentation.
