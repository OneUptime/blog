# Validation Summary: How to Build a Webhook Service with Retry Logic in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- TypeScript
- Webhooks
- HMAC-SHA256 signatures
- Fetch API
- AbortController
- Express
- SQLite
- better-sqlite3
- Exponential backoff and retry logic

## Sources Consulted
- Node.js Crypto documentation: https://nodejs.org/api/crypto.html
- Node.js Globals documentation for Fetch and AbortController: https://nodejs.org/api/globals.html
- Express API documentation: https://expressjs.com/en/api/
- Express body-parser middleware documentation for raw body verification hooks: https://expressjs.com/en/resources/middleware/body-parser/
- SQLite date and time functions documentation: https://sqlite.org/lang_datefunc.html
- better-sqlite3 API documentation: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
- MDN Fetch API documentation: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

## Issues Found
- The signature verification snippet could throw for missing or malformed headers, and `crypto.timingSafeEqual` throws when buffers have different lengths. I changed `verifySignature` to handle missing header parts, validate the timestamp, decode hex signatures into buffers, and check buffer lengths before calling `timingSafeEqual`.
- The Express test endpoint rebuilt the payload with `JSON.stringify(req.body)`, which can differ from the exact bytes that were signed. I changed the example to capture the raw request body with the JSON parser's `verify` hook and verify the signature against that raw payload.
- The SQLite pending-delivery query compared ISO timestamp strings directly with `datetime('now')`. Because `toISOString()` stores timestamps with a `T` separator and `Z` suffix while `datetime('now')` returns a space-separated value, direct text comparison can be wrong. I changed the query to use `datetime(next_attempt_at) <= datetime('now')`.
- Dead-lettered deliveries did not persist the final attempt count or response status. I changed `markAsDead` and its call site so the database reflects the final failed attempt.

## Review Notes
- The post remains a suitable tutorial after the fixes. For a production implementation, the queue would also need atomic claiming or row locking to avoid duplicate processing when multiple workers or overlapping polling cycles read the same pending delivery.
