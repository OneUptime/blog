# Validation Summary: Add Idempotency to a POST Endpoint Without Breaking Older Clients

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- HTTP and REST API semantics
- Idempotency keys
- TypeScript
- Node.js HTTP `IncomingMessage.rawHeaders`
- PostgreSQL transactions, unique constraints, and `INSERT ... ON CONFLICT`
- Cross-Origin Resource Sharing (CORS)

## Sources Consulted

- RFC 9110, HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110.html#name-idempotent-methods
- Node.js HTTP documentation, `message.rawHeaders`: https://nodejs.org/api/http.html#messagerawheaders
- PostgreSQL 18 documentation, `INSERT` and `ON CONFLICT`: https://www.postgresql.org/docs/18/sql-insert.html
- PostgreSQL 18 documentation, index uniqueness checks: https://www.postgresql.org/docs/18/index-unique-checks.html
- Stripe API documentation, idempotent requests: https://docs.stripe.com/api/idempotent_requests
- AWS Builders' Library, Making retries safe with idempotent APIs: https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/
- MDN Web Docs, Cross-Origin Resource Sharing (CORS): https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN Web Docs, `Access-Control-Expose-Headers`: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Expose-Headers

- Stripe API v1 and v2 idempotency differences: https://docs.stripe.com/api-v2-overview#idempotency-differences-between-api-v1-and-api-v2

## Issues Found
- Scoped the retained-outcome policy to Stripe API v1. API v2 has different retry and response behavior, so the original unqualified reference to Stripe was too broad.

## Review Notes
The TypeScript example is intentionally a rollout gate rather than a complete idempotency implementation. Its use of `rawHeaders` correctly preserves separate duplicate field lines in Node.js, but deployed systems still need to verify whether an ingress proxy normalizes or combines them, as the post notes. The PostgreSQL link is version-specific to PostgreSQL 18 and is current for the post date.

The exact TypeScript rollout-gate snippet passed ten local cases covering optional and required policies, valid and case-insensitive headers, empty values, duplicates, comma-joined values, oversized keys, malformed pairs, and unrelated headers.
