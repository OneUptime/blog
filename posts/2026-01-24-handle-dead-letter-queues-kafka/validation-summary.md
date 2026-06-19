# Validation Summary: How to Handle Dead Letter Queues in Kafka

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Apache Kafka consumers and producers
- Kafka dead letter queue patterns
- Java Kafka client
- kafka-python
- Spring Kafka
- Spring Boot Kafka configuration
- Micrometer and Prometheus alerting
- Kafka command-line tools

## Sources Consulted
- Apache Kafka Java client documentation: https://kafka.apache.org/10/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- Apache Kafka consumer documentation: https://kafka.apache.org/25/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Spring Kafka exception handling documentation: https://docs.spring.io/spring-kafka/reference/kafka/annotation-error-handling.html
- Spring Kafka sending messages documentation: https://docs.spring.io/spring-kafka/reference/kafka/sending-messages.html
- Spring Kafka DefaultErrorHandler API documentation: https://docs.spring.io/spring-kafka/api/org/springframework/kafka/listener/DefaultErrorHandler.html
- kafka-python KafkaProducer documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaProducer.html
- kafka-python KafkaConsumer documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaConsumer.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Confluent Kafka CLI tools documentation: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html
- Micrometer naming documentation: https://docs.micrometer.io/micrometer/reference/concepts/naming.html
- Prometheus metric naming documentation: https://prometheus.io/docs/practices/naming/

## Issues Found
- The basic Java DLQ example sent records to the DLQ asynchronously and then allowed the consumer batch offset to be committed before the DLQ write was confirmed. Changed the DLQ send to wait on the returned `Future` with `get()` and to throw on send failure so the offset is not committed after an unconfirmed DLQ write.
- The Python DLQ example waited for the producer send but swallowed send failures, which could allow the caller to commit the source offset after a failed DLQ write. Changed the exception handler to re-raise after logging.
- The Python DLQ example used `traceback.format_exc()` outside the active `except` block, which would not reliably capture the original processing exception. Changed it to format the passed exception object and traceback directly.
- The Python DLQ example used `datetime.utcnow()`, which is deprecated as of Python 3.12 for UTC timestamps. Changed it to `datetime.now(timezone.utc)`.
- The Spring Kafka example used current APIs but omitted imports required by the snippet, including `TopicPartition`, `Service`, and SLF4J logger classes. Added the missing imports.
- The tiered retry Java example omitted Kafka client imports and used asynchronous retry-topic sends before committing offsets. Added missing imports and changed retry-topic sends to wait for acknowledgement.
- The tiered retry Java example skipped delayed retry records but still committed offsets for the batch, which could drop delayed retry messages. Changed the loop to seek back to the delayed record, pause briefly, and skip the commit for that batch.
- The DLQ reprocessor Java example used `producer.send(...).get()` inside a method that did not declare or handle the checked exceptions. Updated the method signature and callers to handle failures, and added a `failed` count to the result.

## Review Notes
The examples are still tutorial snippets with placeholder business logic such as `parseOrder`, `validateOrder`, `saveOrder`, and `doProcess`. Those placeholders are acceptable for the post, but production code should also consider transactions, idempotent producers, bounded retry backoff, partition-level pause/resume for delayed retry topics, and durable storage for processed-message IDs.
