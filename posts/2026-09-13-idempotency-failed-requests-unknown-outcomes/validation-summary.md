# Validation Summary: Should You Cache Failed Idempotent Requests?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HTTP API idempotency
- Error handling and retry policy
- PostgreSQL transactions, concurrency, and SQLSTATE error codes
- Stripe API v1 idempotent requests, server errors, reconciliation, and webhooks

## Sources Consulted
- [Stripe: API v1 idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe: Advanced error handling](https://docs.stripe.com/error-low-level)
- [Stripe: API v2 idempotency differences](https://docs.stripe.com/api-v2-overview#idempotency)
- [PostgreSQL: Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL: Transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [PostgreSQL: Serialization failure handling](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html)
- [PostgreSQL: Explicit locking and deadlocks](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL: Error codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)

## Issues Found
Clarified that the saved initial response, including `500` responses, is Stripe API v1 behavior. Stripe API v2 can re-execute failed or partially failed requests under the same idempotency key and return an updated response, so the original unqualified reference to Stripe was too broad. The API v1 error-handling example and source label now identify their scope.

## Review Notes
The pseudocode is intentionally implementation-neutral rather than executable code. The recommendations correctly distinguish confirmed rollback, committed state, and unknown outcomes. Stripe behavior is explicitly scoped to API v1, and the PostgreSQL retry recommendation is appropriately bounded at the application level. No deprecated APIs are used.
