# Validation Summary: How to Handle Failed Messages with Dead Letter Topics in Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka Java clients
- Kafka topic configuration
- Spring Kafka retry topics and dead letter topics
- Micrometer
- Prometheus alerting rules
- Java

## Sources Consulted
- Apache Kafka Topic Configs: https://kafka.apache.org/41/configuration/topic-configs/
- Apache KafkaProducer Javadocs: https://kafka.apache.org/10/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- Apache KafkaConsumer Javadocs: https://kafka.apache.org/25/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Spring Kafka DLT Strategies: https://docs.spring.io/spring-kafka/reference/retrytopic/dlt-strategies.html
- Spring Kafka Topic Naming: https://docs.spring.io/spring-kafka/reference/retrytopic/topic-naming.html
- Spring Kafka TopicSuffixingStrategy API: https://docs.spring.io/spring-kafka/api/org/springframework/kafka/retrytopic/TopicSuffixingStrategy.html
- Micrometer Counters: https://docs.micrometer.io/micrometer/reference/concepts/counters.html
- Prometheus Query Functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Micrometer Naming Meters: https://docs.micrometer.io/micrometer/reference/concepts/naming.html

## Issues Found
- The manual Kafka consumer example used `Header` without importing `org.apache.kafka.common.header.Header`. Added the missing import so the snippet is syntactically complete.
- The manual DLT publish path used asynchronous `KafkaProducer.send(..., callback)` and then committed consumer offsets after the batch. Because `send` is asynchronous, a DLT publish failure could be logged after the original offset was already committed. Changed the example to wait on `send(...).get()` and throw if the DLT publish fails, so offsets are not committed after an unsuccessful DLT handoff.
- The manual DLT example claimed to include error details but did not preserve the exception class or message. Added `error-class` and `error-message` headers.
- The Spring Kafka example referenced `DltHandler`, `DltStrategy`, `KafkaHeaders`, and `Header` without imports. Added the missing imports from Spring Kafka and Spring Messaging.
- The Micrometer metrics example referenced `registry` inside `recordDltMessage` without storing it as a field. Added a `MeterRegistry` field initialized in the constructor.
- The Prometheus alert described a threshold of more than 10 messages per minute, but `rate(...[5m]) > 10` means more than 10 per second. Changed the expression to `rate(kafka_dlt_messages_total[5m]) > 10 / 60`.
- The DLT reprocessor example used `Header` and `RecordHeader` without imports. Added the missing Kafka header imports.
- The DLT reprocessor imported `StandardCharsets` but used platform-default `String.getBytes()`. Updated the header byte encoding to use `StandardCharsets.UTF_8`.

## Review Notes
The examples are still illustrative and omit application-specific classes such as `Order`, `RetryableException`, `NonRetryableException`, and services like `orderService`, which is acceptable for this type of guide. The Kafka topic configuration commands and Spring Kafka retry topic naming are consistent with the official documentation consulted.
