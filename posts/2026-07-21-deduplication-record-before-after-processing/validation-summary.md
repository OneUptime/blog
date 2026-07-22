# Validation Summary: The Deduplication Race: Should You Record a Message Before or After Processing?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- PostgreSQL transactions, unique constraints, data-modifying common table expressions, and `INSERT ... ON CONFLICT`
- Message-consumer deduplication and idempotent processing
- Azure Service Bus receive modes, locks, and message settlement
- RabbitMQ manual consumer acknowledgments and redelivery
- Google Cloud Pub/Sub exactly-once delivery and acknowledgment deadlines
- Transactional inbox and outbox patterns
- Durable workflow state, downstream idempotency keys, retries, and reconciliation

## Sources Consulted

- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL `WITH` queries and data-modifying statements](https://www.postgresql.org/docs/current/queries-with.html)
- [PostgreSQL `INSERT` and `ON CONFLICT`](https://www.postgresql.org/docs/current/sql-insert.html)
- [Azure Service Bus: Prevent message loss and duplicate processing](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-message-loss-and-duplicates)
- [RabbitMQ consumer acknowledgments and publisher confirms](https://www.rabbitmq.com/docs/confirms)
- [Google Cloud Pub/Sub exactly-once delivery](https://docs.cloud.google.com/pubsub/docs/exactly-once-delivery)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [AWS Builders' Library: Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)

## Issues Found

No technical issues found.

## Review Notes

The PostgreSQL example correctly uses a unique constraint as the concurrency arbiter and passes the successful insert through `RETURNING` to gate the business update. Its transaction remains open after the shown statement by design; the surrounding application must explicitly commit or roll back according to the returned flags before settling the broker delivery, as the post explains. No product versions are pinned, and the linked current documentation supports the described behavior as of the validation date.
