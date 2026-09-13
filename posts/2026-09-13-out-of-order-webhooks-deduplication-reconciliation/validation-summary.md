# Validation Summary: Handle Duplicate Webhooks That Arrive Out of Order

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Stripe webhooks and Subscription API
- PostgreSQL
- SQL upserts and conditional updates
- Idempotent event processing
- Durable inbox/outbox and reconciliation patterns

## Sources Consulted

- [Stripe webhook event ordering and duplicate handling](https://docs.stripe.com/webhooks#event-ordering)
- [Stripe Event object](https://docs.stripe.com/api/events/object)
- [Stripe Retrieve a subscription API](https://docs.stripe.com/api/subscriptions/retrieve)
- [PostgreSQL INSERT and ON CONFLICT documentation](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL transaction isolation documentation](https://www.postgresql.org/docs/current/transaction-iso.html)

## Issues Found
No technical issues found.

## Review Notes
The SQL examples are syntactically valid and their concurrency claims match PostgreSQL's documented row locking, conditional update, and `RETURNING` behavior. Stripe's documentation confirms that event delivery order is not guaranteed, snapshot event `created` values have second-level resolution, event IDs should be used to identify duplicate deliveries, and related objects can be retrieved through the API. The post correctly distinguishes provider revisions from local work generations and accurately limits the guarantee provided by the generation guard: it prevents the described local stale-worker race but does not establish a remote object version.
