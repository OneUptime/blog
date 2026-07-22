# Validation Summary: How to Preserve Message Order When Retries and Redelivery Are Enabled

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka 4.3, including the Java producer and consumer APIs
- Amazon SQS FIFO
- AWS SDK for JavaScript v3
- AWS Lambda SQS event source mappings and partial batch responses
- RabbitMQ 4.3 queues, streams, Single Active Consumer, acknowledgements, and requeueing
- SQL conditional updates, transactional inbox deduplication, and the transactional outbox pattern

## Sources Consulted
- [Apache Kafka 4.3 introduction and partition ordering](https://kafka.apache.org/43/getting-started/introduction/)
- [Apache Kafka 4.3 producer configuration](https://kafka.apache.org/43/configuration/producer-configs/)
- [Apache Kafka 4.3 `KafkaProducer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html)
- [Apache Kafka 4.3 `ProducerRecord` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/ProducerRecord.html)
- [Apache Kafka 4.3 basic operations and partition-count changes](https://kafka.apache.org/43/operations/basic-kafka-operations/#modifying-topics)
- [Apache Kafka 4.3 `KafkaConsumer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Amazon SQS FIFO delivery logic](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html)
- [Using SQS FIFO message group IDs](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagegroupid-property.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Amazon SQS `SendMessage` API](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html)
- [Amazon SQS examples for AWS SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_sqs_code_examples.html)
- [AWS Lambda SQS error handling and partial batch responses](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html)
- [Amazon SQS dead-letter queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)
- [RabbitMQ 4.3 queue and message-ordering documentation](https://www.rabbitmq.com/docs/queues#message-ordering)
- [RabbitMQ 4.3 Single Active Consumer documentation](https://www.rabbitmq.com/docs/consumers#single-active-consumer)
- [RabbitMQ 4.3 consumer acknowledgement and requeue documentation](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ 4.3 streams documentation](https://www.rabbitmq.com/docs/streams)

## Issues Found
- Kafka offsets were described as contiguous. Kafka preserves partition order, but offsets visible to a consumer are not guaranteed to be numerically consecutive, including with compacted data and transactional records. Changed the guidance to advance across the completed prefix of records actually returned by `poll`, while retaining the warning not to commit past an unresolved record.
- The SQS FIFO section said that a message group remains blocked behind a failed message after its visibility timeout expires. Once the message is visible again, one receive can return that message and later messages from the same group in a single ordered batch. Changed the guidance to require serial per-group batch handling and stopping at the first failure. Also clarified that extending visibility reduces, rather than eliminates, the chance of overlapping delivery because SQS delivery remains at least once.
- The RabbitMQ ordering recipe did not include all current queue requirements. Added the requirement to return requeued deliveries in received order and, for quorum queues, to configure a delivery limit so requeued messages return to the front. Clarified that Single Active Consumer selects one broker consumer but does not serialize that consumer's application thread pool, and that automatic requeue on channel closure applies when manual acknowledgements are used.

## Review Notes
- The Kafka Java example uses the current `ProducerRecord(String topic, K key, V value)` constructor, and the SQS example uses the current AWS SDK for JavaScript v3 `SendMessageCommand` request shape.
- Kafka 4.3 documentation and Javadocs are available at the cited versioned URLs, and the post's idempotent-producer limits and partition-expansion warning match that release.
- The SQL example is intentionally driver-neutral parameterized SQL. Its correctness depends on executing the inbox insert and conditional aggregate update in one database transaction, as the post states.
