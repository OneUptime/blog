# Validation Summary: SQS Visibility Timeouts: Preventing Two Workers from Processing the Same Message

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Simple Queue Service (SQS) standard queues
- Amazon SQS FIFO queues and message groups
- SQS visibility timeouts, receipt handles, and message deletion
- At-least-once delivery and idempotent consumers
- SQS dead-letter queues and redrive
- Amazon CloudWatch SQS metrics
- PostgreSQL transactions, `INSERT ... ON CONFLICT`, data-modifying CTEs, and conditional `UPDATE`

## Sources Consulted
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Amazon SQS `ReceiveMessage` API](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html)
- [Amazon SQS `ChangeMessageVisibility` API](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ChangeMessageVisibility.html)
- [Amazon SQS `DeleteMessage` API](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_DeleteMessage.html)
- [Amazon SQS queue and message identifiers](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-message-identifiers.html)
- [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS FIFO queue delivery logic](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html)
- [Using dead-letter queues in Amazon SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)
- [Configuring Amazon SQS dead-letter queue redrive](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-dead-letter-queue-redrive.html)
- [Available CloudWatch metrics for Amazon SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html)
- [PostgreSQL `INSERT`](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL `WITH` queries](https://www.postgresql.org/docs/current/queries-with.html)
- [PostgreSQL `UPDATE`](https://www.postgresql.org/docs/current/sql-update.html)
- [PostgreSQL comparison functions and operators](https://www.postgresql.org/docs/current/functions-comparison.html)

## Issues Found
- The timeout-sizing example described a "fixed 90-second task" with a p99 duration of 52 seconds, which was internally contradictory. It now describes a workload with a measured 52-second p99 and a possible initial 75-second timeout.
- The idempotency transaction inserted the invoice unconditionally after `ON CONFLICT DO NOTHING`, so a conflicting delivery could still repeat the business effect. The inbox claim is now a data-modifying CTE, and the invoice is inserted only from the row returned by a successful claim.
- The fencing example did not acquire a work item whose `lease_until` was `NULL`, and a reusable worker identity would not safely distinguish overlapping receive attempts. The query now handles an uninitialized lease and uses a unique per-receive `attempt_id`; later writes use the most recently returned fencing version.
- The FIFO explanation omitted that one `ReceiveMessage` call can return multiple messages from the same message group and implied that an expired message remained in flight. It now distinguishes same-batch delivery, visibility expiry, redelivery, and the subsequent in-flight period.

## Review Notes
The `ChangeMessageVisibility` and `DeleteMessage` examples are intentionally API-level pseudocode, and the SQL uses application-supplied named bind parameters. No deprecated APIs, invalid links, or version-specific claims were found after the corrections. The post correctly treats visibility as a bounded, renewable lease rather than an exactly-once or ownership guarantee.
