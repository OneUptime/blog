# Validation Summary: How to Trace Kafka Producer-Consumer Chains with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apache Kafka
- OpenTelemetry
- OpenTelemetry Java instrumentation
- OpenTelemetry Python confluent-kafka instrumentation
- W3C Trace Context
- OpenTelemetry Collector
- Java
- Python

## Sources Consulted
- OpenTelemetry blog, "Instrumenting Apache Kafka clients with OpenTelemetry": https://opentelemetry.io/blog/2022/instrument-kafka-clients/
- OpenTelemetry Java instrumentation releases: https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases
- OpenTelemetry Java instrumentation KafkaTelemetry source for v2.28.1: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/v2.28.1/instrumentation/kafka/kafka-clients/kafka-clients-2.6/library/src/main/java/io/opentelemetry/instrumentation/kafkaclients/v2_6/KafkaTelemetry.java
- Maven Central, opentelemetry-kafka-clients-2.6 artifact: https://central.sonatype.com/artifact/io.opentelemetry.instrumentation/opentelemetry-kafka-clients-2.6
- OpenTelemetry Python confluent-kafka instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/confluent_kafka/confluent_kafka.html
- OpenTelemetry Python confluent-kafka instrumentation source: https://github.com/open-telemetry/opentelemetry-python-contrib/tree/main/instrumentation/opentelemetry-instrumentation-confluent-kafka
- OpenTelemetry messaging span semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Kafka semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- Apache Kafka ProducerInterceptor Javadoc: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/ProducerInterceptor.html
- Apache Kafka ConsumerInterceptor Javadoc: https://kafka.apache.org/22/javadoc/org/apache/kafka/clients/consumer/ConsumerInterceptor.html
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The Java dependency versions were stale. Updated `opentelemetry-kafka-clients-2.6` from `2.12.0-alpha` to `2.28.1-alpha` and `opentelemetry-api` from `1.46.0` to `1.62.0`, matching the current OpenTelemetry Java instrumentation release checked during review.
- The Java examples used `TracingProducerInterceptor` and `TracingConsumerInterceptor`, which OpenTelemetry Java instrumentation deprecated in v2.22.0. Replaced direct deprecated class-name configuration with `KafkaTelemetry.create(GlobalOpenTelemetry.get()).producerInterceptorConfigProperties()` and `.consumerInterceptorConfigProperties()`.
- The post described the consumer span as a direct child of the producer span. Updated the explanation to reflect current messaging semantic conventions, where producer-consumer correlation may be represented with span links rather than a direct parent-child relationship.
- The post used older messaging attribute names such as `messaging.destination`, `messaging.kafka.partition`, `messaging.kafka.consumer.group`, and `messaging.kafka.message.offset`. Updated them to current semantic convention names such as `messaging.destination.name`, `messaging.destination.partition.id`, `messaging.consumer.group.name`, and `messaging.kafka.offset`.
- The Python install command omitted the OTLP gRPC exporter package required by the `OTLPSpanExporter` import. Added `opentelemetry-exporter-otlp-proto-grpc`.
- Adjusted wording in the batch-processing example so it says each per-message span uses the extracted trace context instead of saying it "links" while the code actually sets a parent context.

## Review Notes
The Java Kafka instrumentation artifact still has an `-alpha` suffix, and the OpenTelemetry documentation notes that alpha instrumentation artifacts can have breaking changes. The Collector configuration structure and OTLP receiver endpoints were correct for a minimal example. The Python confluent-kafka instrumentation behavior matched the official docs and source, including global instrumentation and produce/poll wrapping.
