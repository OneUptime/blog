# Validation Summary: Use Idempotency Keys and Correlation IDs for Safe API Retries

## Status
validated

## Post Type
Technical implementation guide.

## Technologies Covered
- HTTP/1.1, API retries, and idempotency keys
- PostgreSQL transactions, composite primary keys, and INSERT ON CONFLICT
- JSON payload canonicalization and response storage
- Correlation IDs, structured logging, and response replay
- Stripe API idempotency and request IDs
- Durable workflows and transactional outboxes

## Sources Consulted
- Stripe idempotent requests: https://docs.stripe.com/api/idempotent_requests
- Stripe request IDs: https://docs.stripe.com/api/request_ids
- PostgreSQL INSERT and ON CONFLICT: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL transaction isolation: https://www.postgresql.org/docs/current/transaction-iso.html
- PostgreSQL transactions: https://www.postgresql.org/docs/current/tutorial-transactions.html
- PostgreSQL CREATE TABLE: https://www.postgresql.org/docs/current/sql-createtable.html
- RFC 9112, HTTP/1.1, sections 3.2 and 6.3: https://www.rfc-editor.org/rfc/rfc9112.html
- RFC 9110, HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110.html
- RFC 8785, JSON Canonicalization Scheme: https://www.rfc-editor.org/rfc/rfc8785.html
- AWS transactional outbox pattern: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html

## Issues Found
- The HTTP/1.1 request example omitted the required Host header and lacked Content-Length or Transfer-Encoding despite showing a JSON body. Added `Host: api.example.com` and `Content-Length: 51`. RFC 9112 requires Host for HTTP/1.1 requests and treats a request without body framing as having no body. Verified that the displayed JSON payload is 51 UTF-8 bytes, excluding the presentation newline.

## Review Notes
- Confirmed Stripe documents parameter comparison, replay of the initial status and body including 500 responses, retention behavior, and cases where execution has not begun and no result is saved. The article correctly treats this as an API-specific contract.
- Reviewed the schema and parameterized INSERT against PostgreSQL documentation. The composite primary key provides the intended tenant/operation/key scope; ON CONFLICT DO NOTHING permits an omitted conflict target, and RETURNING reports inserted rows.
- Confirmed that Read Committed uses a fresh statement snapshot and that a conflicting insert can wait for another transaction. The subsequent read is appropriate for this isolation level. Implementations using stronger isolation must account for their different retry requirements.
- The SQL is explicitly a transaction outline. Application code must bind parameters, implement the business write and completion update, compare hashes, and handle errors. No live database or end-to-end concurrency tests were executed; this review checked syntax and behavior against documentation.
- The single-transaction design correctly keeps the reservation and database business outcome atomic. The external-side-effect caveat and downstream idempotency/outbox guidance are accurate; an outbox can deliver duplicates and requires appropriate downstream handling.
- Correlation header naming and generation are application contract choices. Keeping original and current attempt IDs separately is consistent with request-level diagnostics and does not affect idempotency uniqueness.
- Canonical input hashing is appropriate. Implementations must define semantic inputs and canonicalization rules; JSONB response storage preserves JSON values rather than exact original wire formatting.
- Retention, expiry, tenant isolation, response replay rules, and crash/concurrency tests are appropriately identified as contract and implementation responsibilities. The sample schema does not implement automatic expiry.
- Parsed both JSON examples successfully and checked the corrected HTTP body length. There are no terminal commands or configuration files in the post. The three official documentation links resolve to the intended resources. No deprecated API usage or explicit version claims requiring correction were found.
