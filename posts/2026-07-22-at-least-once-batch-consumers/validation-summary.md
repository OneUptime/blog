# Validation Summary: At-Least-Once Batch Consumers: Handling Partial Failures and Retries

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka 4.3 consumer API and offset management
- Java Kafka consumer code
- AWS Lambda event source mappings
- Amazon SQS standard and FIFO queues
- Amazon Kinesis Data Streams
- RabbitMQ consumer acknowledgements and prefetch
- Relational database transactions, inbox deduplication, and idempotent processing

## Sources Consulted
- [Apache Kafka 4.3.1 `KafkaConsumer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Apache Kafka 4.3.1 `ConsumerRecords` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRecords.html)
- [Apache Kafka 4.3.1 `OffsetAndMetadata` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/OffsetAndMetadata.html)
- [Apache Kafka 4.3 consumer configuration](https://kafka.apache.org/43/configuration/consumer-configs/)
- [AWS Lambda with Amazon SQS](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)
- [AWS Lambda SQS error handling and partial batch responses](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html)
- [AWS Lambda Kinesis partial batch responses](https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-batchfailurereporting.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [RabbitMQ consumer acknowledgements and prefetch](https://www.rabbitmq.com/docs/confirms)

## Issues Found
- The opening checkpoint rule was stated universally even though independent queue messages can be acknowledged individually and do not have a single contiguous offset frontier. Scoped the rule to ordered sources.
- The Kafka example used manual `commitSync` calls without saying that automatic offset commits must be disabled. Added `enable.auto.commit=false`; Kafka 4.3 defaults this setting to `true`, which could otherwise commit offsets for records returned by `poll()` before their effects are durable.

## Review Notes
- The Java block is an illustrative fragment that depends on surrounding declarations and imports. Its Kafka methods and constructors are current and non-deprecated in Kafka 4.3.1.
- `OffsetAndMetadata(long)` is valid. Kafka also recommends including the consumed record's leader epoch in committed metadata when practical to strengthen log-truncation detection.
- The AWS Lambda SQS full-batch retry, SQS partial failure, SQS FIFO ordering, Kinesis lowest-failed-sequence checkpoint, and RabbitMQ cumulative acknowledgement claims match the current official documentation.
