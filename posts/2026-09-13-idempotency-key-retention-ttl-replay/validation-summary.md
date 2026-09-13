# Validation Summary: How Long Should Idempotency Keys Live?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Idempotency keys and API retry design
- PostgreSQL composite primary keys and foreign keys
- PostgreSQL transactions and uniqueness constraints
- PostgreSQL `statement_timestamp()`
- PostgreSQL row locking with `FOR UPDATE SKIP LOCKED`
- Stripe API v1 idempotent requests

## Sources Consulted
- [Stripe API v1 idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe API v2 overview and idempotency differences](https://docs.stripe.com/api-v2-overview)
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL SELECT locking clause](https://www.postgresql.org/docs/current/sql-select.html)
- [PostgreSQL date/time functions](https://www.postgresql.org/docs/current/functions-datetime.html)

## Issues Found
- The post attributed the 24-hour pruning rule to Stripe's API without a version qualifier. Stripe documents that behavior for API v1, while API v2 has different idempotency semantics and a 30-day replay window. Changed the text and documentation-link label to identify API v1 explicitly.

## Review Notes
The SQL table definitions, composite foreign key, fixed expiry comparison, and bounded `FOR UPDATE SKIP LOCKED` cleanup statement are valid in current PostgreSQL. The suggested `409` expired-response behavior is an application-level contract choice, not a PostgreSQL or Stripe requirement.
