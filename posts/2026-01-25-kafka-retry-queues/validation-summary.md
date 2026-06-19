# Validation Summary: How to Implement Retry Queues in Kafka

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apache Kafka topics, retention, retry topics, and dead letter queues
- Spring for Apache Kafka listener error handling
- Java Kafka producer and consumer APIs
- Micrometer metrics
- Prometheus alerting rules

## Sources Consulted
- Apache Kafka topic configuration documentation: https://kafka.apache.org/41/configuration/topic-configs/
- Spring for Apache Kafka exception handling documentation: https://docs.spring.io/spring-kafka/reference/kafka/annotation-error-handling.html
- Spring for Apache Kafka non-blocking retries documentation: https://docs.spring.io/spring-kafka/reference/retrytopic.html
- Spring Kafka ConsumerFactory API documentation: https://docs.spring.io/spring-kafka/api/org/springframework/kafka/core/ConsumerFactory.html
- Micrometer Prometheus registry documentation: https://docs.micrometer.io/micrometer/reference/implementations/prometheus.html
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/

## Issues Found
- The topic setup created only two retry topics while the Java examples used `MAX_RETRIES = 3` and defined three retry delays. Added `orders-retry-3` and a matching retry listener so the examples are internally consistent.
- The post said retry topics were created with different retention settings, but only the DLQ command set `retention.ms`. Changed the wording to state that the DLQ gets the longer retention period.
- The main `OrderProcessor` listened to retry topics at the same time as the delayed retry consumer, which would bypass or race the intended delay handling. Limited the main processor listener to the `orders` topic.
- The retry routing code sent the third failed attempt directly to the DLQ topic without DLQ diagnostic headers. Removed the hard-coded two-topic cutoff so max retries are handled by `sendToDlq`.
- The delayed retry requeue path used `kafkaTemplate.send(topic, key, value)`, which dropped retry headers such as `retry-count` and `failure-time`. Changed it to create a `ProducerRecord` and preserve headers.
- Several Spring service snippets declared `final` fields without constructors, which would not compile as plain Java. Added constructor injection to the affected snippets.
- The Spring Kafka section was titled "Retry Template" but used `DefaultErrorHandler`, not the older retry template style. Renamed it to "Spring Kafka Error Handling".
- The Spring backoff example used plain `ExponentialBackOff`, which does not express "1s, 2s, 4s, 8s, then give up" directly. Replaced it with `ExponentialBackOffWithMaxRetries(4)` and explicit interval settings, matching Spring Kafka documentation.
- The DLQ reprocessor created consumer override properties but did not pass them into `ConsumerFactory.createConsumer`, and it used a fixed group id despite generating a UUID in the unused properties. Changed it to create a unique group id and pass the properties via the four-argument `createConsumer` overload.

## Review Notes
The examples remain illustrative and omit imports, domain types, and placeholder methods such as `processOrderInternal`, `parseOrder`, and `validateAndSave`. The delayed retry example is technically consistent after the fixes, but for production Spring Kafka applications, `@RetryableTopic` or managed retry-topic configuration is usually preferable to manually sleeping and requeueing in a listener.
