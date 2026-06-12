# Validation Summary: How to Implement Competing Consumers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Competing Consumers pattern
- RabbitMQ
- Apache Kafka
- Amazon SQS
- Python
- pika
- kafka-python
- boto3
- Redis

## Sources Consulted
- Enterprise Integration Patterns: Competing Consumers: https://www.enterpriseintegrationpatterns.com/patterns/messaging/CompetingConsumers.html
- RabbitMQ Work Queues tutorial for Python: https://www.rabbitmq.com/tutorials/tutorial-two-python
- RabbitMQ Consumer Prefetch documentation: https://www.rabbitmq.com/docs/consumer-prefetch
- kafka-python KafkaConsumer API documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaConsumer.html
- Apache Kafka Consumer API documentation: https://kafka.apache.org/23/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Confluent Kafka consumer group design documentation: https://docs.confluent.io/kafka/design/consumer-design.html
- Amazon SQS ReceiveMessage API Reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html
- Boto3 SQS visibility timeout example: https://docs.aws.amazon.com/boto3/latest/guide/sqs-example-visibility-timeout.html
- Amazon SQS dead-letter queue documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/

## Issues Found
- The pattern introduction claimed each message is processed by exactly one consumer. Updated this to say each message is delivered to one consumer at a time and can be redelivered after failures, matching at-least-once delivery behavior in common brokers.
- The consumer group explanation generalized Kafka-style consumer groups to all queues. Narrowed the claim to brokers that support consumer groups and described Kafka partition assignment accurately.
- The visibility timeout explanation was presented as a universal broker concept. Narrowed it to queue systems such as Amazon SQS, where visibility timeout is the documented mechanism.
- The RabbitMQ callback docstring said the user callback should accept raw pika callback parameters, but the wrapper passes only the decoded message. Corrected the docstring.
- The Kafka example used `message.topic_partition`, which is not a documented kafka-python `ConsumerRecord` attribute. Imported `TopicPartition` and constructed it from `message.topic` and `message.partition`.
- The Kafka example said not committing a failed message was enough, but the loop could continue and later commit past the failed offset on the same partition. Added `seek(topic_partition, message.offset)` after processing failure so the failed record is retried instead of skipped.
- The Kafka `auto_offset_reset='earliest'` comment implied it always starts from the earliest unprocessed message. Corrected it to apply when no committed offset exists.
- The SQS retry comment implied SQS always retries up to a redrive policy limit. Clarified that moving to a DLQ requires a configured redrive policy.
- The SQS example heading mentioned visibility timeout extension, but the example did not call the extension method. Updated the heading to describe the actual example.
- The Redis idempotency helper claimed to ensure exactly-once processing. Adjusted the wording to describe deduplication as a duplicate-processing guard, not a general exactly-once guarantee.

## Review Notes
All Python snippets were parsed with `ast.parse` after the edits. The examples are suitable for tutorial use, but production Kafka consumers should also handle poison messages with bounded retries or a dead-letter topic, and SQS long-running workers should actively extend visibility timeout when processing can exceed the configured timeout.
