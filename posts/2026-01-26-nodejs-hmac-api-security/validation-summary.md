# Validation Summary: How to Secure APIs with HMAC Signing in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- TypeScript
- Express
- Node.js crypto module
- HMAC-SHA256
- API authentication
- Replay attack prevention with timestamps and nonces

## Sources Consulted
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- Express 5.x API reference: https://expressjs.com/en/5x/api/express/
- Express 5.x request API reference: https://expressjs.com/en/5x/api/request/
- RFC 2104, HMAC: Keyed-Hashing for Message Authentication: https://datatracker.ietf.org/doc/html/rfc2104
- AWS Signature Version 4 documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv-create-signed-request.html
- Stripe webhook signature documentation: https://docs.stripe.com/webhooks/signature
- GitHub webhook signature documentation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries

## Issues Found
- The basic signing helper skipped body hashing for an empty string body because it checked `if (components.body)`. Changed this to `components.body !== undefined` so an intentionally empty body is still canonicalized consistently.
- The server examples re-created the body with `JSON.stringify(req.body)` after JSON parsing. This can change the exact bytes that were signed, for example by normalizing whitespace or object formatting. Updated the middleware and complete Express example to use a captured raw body string, and updated the Express JSON parser to store it through the `verify` option.
- The nonce middleware and complete Express example marked nonces as used before signature verification finished. This allowed invalid signed requests to burn a nonce. Updated the flow so the nonce is stored only after the signature is valid.
- The nonce client snippet referenced `method` and `path` variables that were not in scope inside `HmacApiClient.request()`. Changed them to `options.method` and `options.path`.
- The nonce example used Express request/response types without importing them in that code block. Added the missing Express type import.

## Review Notes
- The examples use current stable Node.js crypto APIs: `createHmac`, `createHash`, `timingSafeEqual`, and `randomUUID`.
- The in-memory nonce store is appropriate for a tutorial, but production systems should use a shared store such as Redis when running multiple Node.js processes or servers.
