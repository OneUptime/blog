# Validation Summary: How to Design Idempotent Operations

## Status
validated

## Post Type
Guide / Tutorial (REST API design)

## Technologies Covered
- HTTP methods and semantics (RFC 9110, RFC 5789)
- Node.js / Express.js (web framework)
- Mongoose (MongoDB ODM)
- PostgreSQL (relational database, including `gen_random_uuid()`, `ON CONFLICT`)
- Node.js `crypto` module (`randomUUID`, `createHash`)
- ETags and conditional requests (If-Match)
- Idempotency-Key header (de-facto standard, used by Stripe)
- OpenAPI 3 specification
- Jest + supertest (testing)
- Mermaid diagrams (sequence and state diagrams)

## Sources Consulted
- RFC 9110 (HTTP Semantics), §9.2.1 Safe Methods, §9.2.2 Idempotent Methods, §13.1.1 If-Match — https://www.rfc-editor.org/rfc/rfc9110
- RFC 5789 (PATCH Method for HTTP) — https://www.rfc-editor.org/rfc/rfc5789
- IETF draft: The Idempotency-Key HTTP Header Field — https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
- Stripe API documentation on idempotent requests — https://stripe.com/docs/api/idempotent_requests
- Node.js crypto module documentation (`crypto.randomUUID`, `crypto.createHash`) — https://nodejs.org/api/crypto.html
- Mongoose documentation for `findOneAndUpdate`, `findByIdAndUpdate`, `findByIdAndDelete` — https://mongoosejs.com/docs/api/model.html
- PostgreSQL documentation: `gen_random_uuid()` (built-in since PG 13), `ON CONFLICT` clause — https://www.postgresql.org/docs/current/
- Express.js documentation — https://expressjs.com/
- Jest and supertest documentation

## Issues Found
No technical issues found.

The HTTP method idempotency/safety table is accurate per RFC 9110 (GET/HEAD/OPTIONS safe and idempotent; PUT/DELETE idempotent but not safe; POST neither) and RFC 5789 (PATCH neither safe nor idempotent). The Idempotency-Key header pattern, including key scoping per user, request-hash mismatch detection (returning 422), TTL-based expiration, and concurrent-request handling (returning 409 for in-progress requests), aligns with the IETF draft and Stripe's documented behavior. The PostgreSQL transaction pattern using `ON CONFLICT DO NOTHING RETURNING` is a standard idiom for atomic upsert with detection. The ETag + If-Match pattern (returning 412 Precondition Failed) for PATCH optimistic locking is consistent with RFC 9110 §13.1.1. All Node.js, Mongoose, Express, supertest, and Jest APIs used are valid and current.

## Review Notes
- The Mongoose `overwrite: true` option in `findByIdAndUpdate` is still functional but in newer Mongoose versions `findOneAndReplace` is the more idiomatic alternative for full-document replacement. The code as written is illustrative and conveys PUT-replace semantics clearly, so no change is warranted.
- The middleware in Strategy 1 reassigns `res.json` to an async function. In production, the awaited `IdempotencyStore.updateOne` happens before `originalJson(body)` returns, but Express's caller does not await the returned promise, so a downstream error after `res.json` could theoretically race with the persistence write. This is a known simplification for blog-post brevity, not a factual error.
- The `isNew` check via `createdAt.getTime() === updatedAt.getTime()` is a common heuristic; it relies on both timestamps being set from the same `new Date()` instant on insert. Acceptable for illustration.
- The `404 = not retryable` classification in the error-response table is the conventional choice but ignores the eventual-consistency edge case where a freshly-created resource may briefly return 404; this is a judgment call, not an error.
- None of the above warrant edits to the post.
