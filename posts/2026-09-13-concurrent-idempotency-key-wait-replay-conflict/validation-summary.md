# Validation Summary: Concurrent Idempotency Keys: Wait, Replay, or Return 409?

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- PostgreSQL
- SQL transactions and unique constraints
- PostgreSQL Read Committed isolation
- PostgreSQL `lock_timeout` and `statement_timeout`
- HTTP API idempotency
- HTTP 202, 409, and 503 status codes

## Sources Consulted

- [PostgreSQL 18: INSERT](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL 18: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-READ-COMMITTED)
- [PostgreSQL 18: Client Connection Defaults](https://www.postgresql.org/docs/current/runtime-config-client.html)
- [RFC 9110: 202 Accepted](https://www.rfc-editor.org/rfc/rfc9110.html#name-202-accepted)
- [RFC 9110: 409 Conflict](https://www.rfc-editor.org/rfc/rfc9110.html#name-409-conflict)
- [RFC 9110: 503 Service Unavailable](https://www.rfc-editor.org/rfc/rfc9110.html#name-503-service-unavailable)

## Issues Found
No technical issues found.

## Review Notes
The SQL is a transaction outline rather than a complete handler, as the post explicitly states. Its behavior depends on Read Committed isolation and on retaining the idempotency record while requests can still reference it; both constraints are accurately documented in the post. The `409` response codes are correctly identified as application conventions rather than a standardized HTTP idempotency protocol.
