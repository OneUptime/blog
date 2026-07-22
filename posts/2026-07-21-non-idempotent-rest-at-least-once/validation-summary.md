# Validation Summary: Handling Non-Idempotent REST APIs Under At-Least-Once Delivery

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- REST APIs and HTTP/1.1 semantics
- At-least-once message delivery
- Idempotency keys and client request identifiers
- Stripe API idempotent requests and error handling
- Transactional outbox and durable-command patterns
- PostgreSQL table definition syntax
- Webhooks and reconciliation workflows
- Retry, circuit breaker, and concurrency-control patterns
- Saga orchestration and compensating operations

## Sources Consulted

- [RFC 9110: HTTP Semantics, Section 9.2.2 — Idempotent Methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
- [RFC 9112: HTTP/1.1, Section 6.3 — Message Body Length](https://www.rfc-editor.org/rfc/rfc9112.html#section-6.3)
- [IANA HTTP Field Name Registry](https://www.iana.org/assignments/http-fields/http-fields.xhtml)
- [Stripe: Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe: Advanced error handling](https://docs.stripe.com/error-low-level)
- [AWS Builders' Library: Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- [AWS Prescriptive Guidance: Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [AWS Prescriptive Guidance: Saga orchestration pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-orchestration.html)
- [Azure Architecture Center: Retry pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry)
- [PostgreSQL documentation: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL documentation: Date/Time Types](https://www.postgresql.org/docs/current/datatype-datetime.html)

## Issues Found

- The raw HTTP/1.1 request included a JSON payload without `Content-Length` or `Transfer-Encoding`. Under RFC 9112, such a request has a zero-length message body, so the displayed JSON would not be part of the request. The example now uses a deterministic 68-byte compact JSON payload and includes `Content-Length: 68`.

## Review Notes

- The SQL example is valid PostgreSQL syntax; `timestamptz` is PostgreSQL's alias for `timestamp with time zone` and is not portable SQL.
- The provider-specific Stripe behavior, including cached `500` responses, parameter comparison, pre-idempotency-layer failures, and key pruning after at least 24 hours, matches the current Stripe documentation.
- The remaining claims about HTTP idempotency, ambiguous network outcomes, durable intent, duplicate outbox delivery, retries, reconciliation, and saga compensation are consistent with the consulted official guidance.
- All documentation links in the post resolved to the intended authoritative resources during review.
