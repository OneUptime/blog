# Validation Summary: Cross-Cloud Messaging with SQS, Pub/Sub, and Service Bus

## Status
validated

## Post Type
Technical architecture guide

## Technologies Covered

- Amazon Simple Queue Service (SQS), including Standard and FIFO queues
- Google Cloud Pub/Sub
- Azure Service Bus
- CloudEvents 1.0-compatible event metadata
- PostgreSQL transactional inbox pattern
- Transactional outbox pattern
- At-least-once delivery, idempotency, ordered message groups, lease renewal, and dead-letter handling

## Sources Consulted

- [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Amazon SQS FIFO queue key terms](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-key-terms.html)
- [Amazon SQS `SendMessage` API](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html)
- [Amazon SQS dead-letter queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)
- [Amazon SQS message quotas](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html)
- [AWS Prescriptive Guidance: Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [Google Cloud Pub/Sub subscription overview](https://cloud.google.com/pubsub/docs/subscription-overview)
- [Google Cloud Pub/Sub exactly-once delivery](https://cloud.google.com/pubsub/docs/exactly-once-delivery)
- [Google Cloud Pub/Sub lease management](https://cloud.google.com/pubsub/docs/lease-management)
- [Google Cloud Pub/Sub ordered delivery](https://cloud.google.com/pubsub/docs/ordering)
- [Google Cloud Pub/Sub dead-letter topics](https://cloud.google.com/pubsub/docs/dead-letter-topics)
- [Google Cloud Pub/Sub quotas and limits](https://cloud.google.com/pubsub/quotas)
- [Google Cloud Pub/Sub `PubsubMessage` REST resource](https://cloud.google.com/pubsub/docs/reference/rest/v1/PubsubMessage)
- [Azure Service Bus message transfers, locks, and settlement](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-transfers-locks-settlement)
- [Azure Service Bus `SendMessageAsync` API](https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebussender.sendmessageasync?view=azure-dotnet)
- [Azure Service Bus duplicate detection](https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection)
- [Azure Service Bus dead-letter queues](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues)
- [Azure Service Bus message sequencing](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sequencing)
- [Azure Service Bus performance best practices](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-performance-improvements)
- [Azure Service Bus quotas and limits](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-quotas)
- [CloudEvents specification](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)
- [PostgreSQL `INSERT` documentation](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL data-modifying `WITH` queries](https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-MODIFYING)

## Issues Found

- The publisher contract required a provider-generated message ID from every successful send. Azure Service Bus uses an application-defined `MessageId`, and its send operation completes without returning a broker-generated ID. The contract now returns a publish receipt whose provider message ID is optional and requires completion only after broker confirmation.
- The adapter contract presented `dead_letter(reason)` as though it were uniformly available. Azure Service Bus supports explicit dead-letter settlement with a reason, but SQS and Pub/Sub ordinarily move failed messages through configured policies. The post now marks explicit dead-lettering as capability-dependent and warns that copy-then-ack emulation is not atomic.
- The event-ID mapping did not explain how to activate native send deduplication. The post now maps the stable logical ID to SQS FIFO `MessageDeduplicationId` and Azure Service Bus `MessageId` when native deduplication is enabled, while clarifying that Pub/Sub assigns its own provider message ID.
- The inbox SQL said to continue only after a successful insert, but the shown statements did not conditionally gate the `UPDATE`. It now uses `INSERT ... ON CONFLICT ... RETURNING` in a PostgreSQL CTE and an `EXISTS` predicate, and states the required unique constraint on `(consumer, message_id)`.
- The lease-renewal guidance delayed tracking until worker handoff even though SQS visibility, Pub/Sub acknowledgment deadlines, and Service Bus locks begin when a delivery is received or locked. It now starts lease tracking at acquisition and renews while the adapter intends to retain the delivery.
- The Pub/Sub ordering mapping omitted the requirement that messages sharing an ordering key be published in the same region. That regional publishing condition is now explicit.
- The dead-letter provisioning wording incorrectly implied that all providers require a separately provisioned target. The post now distinguishes SQS queues, Pub/Sub topics/subscriptions and IAM permissions, and Azure Service Bus's built-in dead-letter subqueue. It also records that Pub/Sub's delivery-attempt threshold is approximate and that policy-driven SQS/Pub/Sub dead-lettering cannot add a consumer-supplied last error to the original message.

## Review Notes

- The capability JSON is an adapter-defined example rather than a statement of provider defaults. Implementations should report the enforced limit for their configured tier and protocol and account for message attributes/properties where those count toward the provider's message-size limit.
- The SQL example uses PostgreSQL syntax. Named placeholders such as `:message_id` are intended to be bound by the application's database client.
- No provider SDK code or CLI commands are included, so there are no client-library deprecations or command flags to validate.
