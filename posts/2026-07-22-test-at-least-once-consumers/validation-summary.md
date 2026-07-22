# Validation Summary: How to Test At-Least-Once Consumers with Crashes, Timeouts, and Rebalances

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- At-least-once message delivery and idempotent consumers
- Apache Kafka 4.3 consumer groups, offsets, rebalances, and `MockConsumer`
- Amazon SQS visibility timeouts, receipt handles, and message deletion
- AWS Lambda SQS partial batch responses
- RabbitMQ manual consumer acknowledgements and redelivery
- Testcontainers for Java Kafka module
- Testcontainers Toxiproxy module
- Database transactions, unique constraints, inboxes, and outboxes
- Fault injection and concurrent integration testing

## Sources Consulted

- [Apache Kafka 4.3.1 `KafkaConsumer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Apache Kafka 4.3.1 `ConsumerRebalanceListener` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html)
- [Apache Kafka 4.3.1 `MockConsumer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/MockConsumer.html)
- [Apache Kafka 4.3 consumer configuration](https://kafka.apache.org/43/generated/consumer_config.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Amazon SQS `Message` API](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_Message.html)
- [Amazon SQS `ReceiveMessage` API](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html)
- [Amazon SQS `ChangeMessageVisibility` API](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ChangeMessageVisibility.html)
- [Amazon SQS `DeleteMessage` API](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_DeleteMessage.html)
- [AWS Lambda SQS error handling and partial batch responses](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html)
- [RabbitMQ consumer acknowledgements and publisher confirms](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ quorum queues and poison-message handling](https://www.rabbitmq.com/docs/quorum-queues)
- [RabbitMQ dead-letter exchanges](https://www.rabbitmq.com/docs/dlx)
- [Testcontainers for Java Kafka module](https://java.testcontainers.org/modules/kafka/)
- [Testcontainers for Java Toxiproxy module](https://java.testcontainers.org/modules/toxiproxy/)

## Issues Found

- The Kafka rebalance test did not explicitly disable automatic offset commits, even though Kafka 4.3 enables them by default. Added `enable.auto.commit=false` so the test can reliably leave the processed record uncommitted and exercise replay.
- Adding a second Kafka consumer does not by itself guarantee that the first consumer will revoke a partition in every topic and assignment layout. Clarified that the test must use partitions and subscriptions that require ownership to move.
- The pre-commit crash assertion incorrectly excluded designs that durably persist a separate in-progress inbox claim. Clarified that such a claim is valid only if it remains retryable or reclaimable and does not falsely mark completion.
- The SQS visibility-timeout wording treated successful renewal as proof of an exclusive lease. Clarified that a timed-out renewal has an unknown outcome and that visibility does not replace idempotency.
- The Lambda SQS partial-batch statement omitted the required handler behavior. Clarified that the handler must catch record-level errors and return a valid `batchItemFailures` response; an uncaught exception fails the whole batch. Also clarified that FIFO responses include the failed record as well as the unprocessed suffix.
- The RabbitMQ poison-message check could be read as claiming that every queue type has a broker-managed delivery limit. Clarified that native `delivery-limit` handling applies to quorum queues; other designs need an application retry limit before dead-lettering.

## Review Notes

- The Kafka URLs resolve to the Kafka 4.3.1 API, so the post's Kafka 4.3 references are current for the stated version.
- The post contains pseudocode and test procedures rather than executable application code or shell commands; syntax validation was therefore limited to named APIs, configuration keys, and protocol behavior.
- Kafka's `max.poll.interval.ms` behavior has a static-membership caveat: when `group.instance.id` is set, partition reassignment waits for the applicable session timeout after the poll interval is exceeded. The post's phrase “applicable group liveness boundary” is compatible with this behavior.
- `org.testcontainers.containers.KafkaContainer` is deprecated in current Testcontainers for Java documentation, but the post names only the Kafka module and does not recommend that deprecated class.
