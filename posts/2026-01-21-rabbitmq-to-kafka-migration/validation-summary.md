# Validation Summary: How to Migrate from RabbitMQ to Kafka

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Apache Kafka
- RabbitMQ
- Java
- Python
- Pika
- confluent-kafka-python

## Sources Consulted
- RabbitMQ Java Client API Guide: https://www.rabbitmq.com/client-libraries/java-api-guide
- RabbitMQ Consumer Acknowledgements and Publisher Confirms: https://www.rabbitmq.com/docs/confirms
- RabbitMQ Negative Acknowledgements: https://www.rabbitmq.com/docs/nack
- Apache Kafka KafkaProducer JavaDoc: https://kafka.apache.org/10/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- Apache Kafka KafkaConsumer JavaDoc: https://kafka.apache.org/25/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Apache Kafka topic configuration reference: https://kafka.apache.org/30/generated/topic_config.html
- Confluent confluent-kafka-python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Pika channel documentation: https://pika.readthedocs.io/en/stable/modules/channel.html

## Issues Found
- The RabbitMQ replay comparison was too absolute. Changed "Not possible" to "Not for acknowledged queue messages" and clarified Kafka replay is limited by retention.
- The Java RabbitMQ-to-Kafka bridge acknowledged RabbitMQ messages from the asynchronous Kafka callback. Changed it to wait for Kafka send confirmation and ack/nack in the consumer callback flow.
- The Java bridge omitted required imports for `Properties` and UTF-8 handling. Added `java.util.Properties` and `java.nio.charset.StandardCharsets`.
- The dual-write example described synchronous Kafka send as "consistency." Updated the comment to clarify it waits for Kafka but is not atomic with RabbitMQ.
- The Java topic router sent migrated Kafka records asynchronously despite declaring `throws Exception`. Changed it to wait on the send result.
- The Java Kafka consumer committed offsets even on empty polls. Added a records-empty guard before `commitSync()`.
- The Python RabbitMQ-to-Kafka bridge used a single `poll(0)` after producing, which does not guarantee delivery callbacks run before deciding whether to ack RabbitMQ. Changed it to `flush()` and ack/nack based on the delivery callback result.
- The Python confluent-kafka examples used `poll(0)` where the sample intended confirmed delivery. Changed those examples to `flush()`.
- The Python consumer committed the current assignment without binding the commit to the processed message. Changed it to `consumer.commit(message=msg, asynchronous=False)`.
- The Python RabbitMQ topic exchange mapper approximated wildcard matching with `startswith`, which did not correctly model AMQP topic wildcard semantics and only emitted the first matching mapping. Added a token-based `*`/`#` matcher and allowed all matching mappings to produce.

## Review Notes
The examples are still intentionally simplified and do not cover production concerns such as idempotent Kafka producers, transactions, dead-letter handling, backpressure, batching, prefetch tuning, or atomic dual-write/outbox patterns. Those are useful future improvements but were outside the scope of correctness fixes.
