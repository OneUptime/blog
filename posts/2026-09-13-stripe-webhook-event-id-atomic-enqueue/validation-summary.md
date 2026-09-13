# Validation Summary: Claim Stripe Webhook Event IDs Before Enqueuing Work

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Stripe webhooks and the Stripe Python SDK
- PostgreSQL transactions, common table expressions, `ON CONFLICT`, and `RETURNING`
- Durable database-backed queues
- Transactional outbox messaging
- SQS and RabbitMQ
- Idempotency and deduplication

## Sources Consulted
- [Stripe webhooks](https://docs.stripe.com/webhooks)
- [Stripe webhook signature verification](https://docs.stripe.com/webhooks/signature)
- [Stripe event notification handlers](https://docs.stripe.com/webhooks/event-notification-handlers)
- [Stripe Python webhook implementation](https://github.com/stripe/stripe-python/blob/master/stripe/_webhook.py)
- [PostgreSQL `INSERT`](https://www.postgresql.org/docs/current/sql-insert.html)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

## Issues Found
No technical issues found.

## Review Notes
The Python example correctly uses `stripe.Webhook.construct_event` for snapshot events and preserves the raw request body for signature verification. Current Stripe Python SDKs use the separate event-notification-handler flow for thin event notifications, consistent with the post's caveat. The PostgreSQL schema and transactional CTE correctly ensure that the inbox receipt and durable job commit or roll back together, including under concurrent duplicate delivery. The external-broker discussion correctly describes the transactional outbox's possible duplicate-publication window and the resulting need for idempotent consumers.
