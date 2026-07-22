# Validation Summary: How Long Should You Retain Message IDs for Deduplication?

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Amazon SQS FIFO queues, visibility timeouts, dead-letter queues, and redrive
- Azure Service Bus duplicate detection and peek-lock delivery
- Google Cloud Pub/Sub message retention, snapshots, and seek replay
- PostgreSQL primary keys, unique indexes, and transactions
- Idempotent consumer and relational inbox patterns
- HMAC-based pseudonymous lookup keys

## Sources Consulted

- [Amazon SQS FIFO message deduplication IDs](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagededuplicationid-property.html)
- [Amazon SQS queue parameters and message retention](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-queue-parameters.html)
- [Amazon SQS dead-letter queue retention](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)
- [Amazon SQS dead-letter queue redrive](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-dead-letter-queue-redrive.html)
- [Azure Service Bus duplicate detection](https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection)
- [Azure Service Bus message loss and duplicate processing](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-message-loss-and-duplicates)
- [Google Cloud Pub/Sub replay and retention](https://docs.cloud.google.com/pubsub/docs/replay-overview)
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL `INSERT`](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL date/time types](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [RFC 2104: HMAC](https://www.rfc-editor.org/rfc/rfc2104.html)

## Issues Found

- The DLQ inventory row counted only DLQ retention and response time. That can underestimate duplicate age when a message passes through source-queue retention, DLQ retention, redrive delay, and a fresh destination retention period. Changed the row to require end-to-end route timing, including any timestamp or retention resets.
- The relational inbox explanation could imply that a primary key alone prevents duplicate business effects. Clarified that the ledger insert and database business change must commit atomically; external effects require independent idempotency or a recoverable handoff.

## Review Notes

- The SQL table definition is valid PostgreSQL syntax, and its composite primary key correctly enforces uniqueness for the stated consumer and producer scope.
- The provider-specific limits were current when reviewed: Amazon SQS FIFO uses a five-minute deduplication window; Azure Service Bus supports a 20-second to 7-day duplicate-detection window with a 10-minute default on Standard and Premium tiers; and Google Cloud Pub/Sub topic or subscription retention can preserve acknowledged messages for replay for up to 31 days. Pub/Sub snapshots have a separate maximum lifetime of seven days.
- Amazon SQS assigns a new message ID and enqueue time during DLQ redrive, so preserving an application-level operation ID is necessary for end-to-end processing deduplication.
