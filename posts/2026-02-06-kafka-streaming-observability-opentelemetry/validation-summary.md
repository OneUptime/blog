# Validation Summary: How to Build Real-Time Kafka Streaming Observability with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka Streams
- OpenTelemetry Java API
- OpenTelemetry context propagation
- OpenTelemetry semantic conventions for Kafka and messaging
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Kafka Metrics Receiver
- PromQL
- Java

## Sources Consulted
- OpenTelemetry Kafka semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
- OpenTelemetry messaging span semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Java `TextMapPropagator` Javadoc: https://www.javadoc.io/doc/io.opentelemetry/opentelemetry-context/latest/io/opentelemetry/context/propagation/TextMapPropagator.html
- OpenTelemetry Java Kafka instrumentation guide: https://opentelemetry.io/blog/2022/instrument-kafka-clients/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector receiver registry: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector Contrib Kafka Metrics Receiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/kafkametricsreceiver
- Apache Kafka Streams Processor API Javadocs: https://javadoc.io/doc/org.apache.kafka/kafka-streams/latest/org/apache/kafka/streams/processor/api/Processor.html

## Issues Found
- The post used older messaging semantic convention attribute names such as `messaging.operation`, `messaging.kafka.partition`, and `messaging.kafka.consumer.group`. Updated the examples to current names such as `messaging.operation.name`, `messaging.operation.type`, `messaging.destination.partition.id`, and `messaging.consumer.group.name`.
- The producer and DLQ examples used `Context.current().with(span)` for explicit context propagation. Updated those snippets to use the current Java API pattern, `span.storeInContext(Context.current())`.
- The consumer section described the consumer span as "linked" while the code uses parent context for a single-message processing span. Clarified the wording to say the span is connected/correlated with the producer span.
- The Kafka Streams wrapper created a span but did not make it current while invoking the delegate processor, so nested instrumentation inside the delegate would not inherit the span. Added `Scope` and wrapped `delegate.process(record)` in `try (Scope scope = span.makeCurrent())`.
- The Collector config used `kafkametrics`, which is now documented as a deprecated alias. Updated the receiver name and pipeline reference to `kafka_metrics`.
- The Collector comment and explanation described the Kafka Metrics Receiver as scraping Kafka broker JMX metrics and providing topic throughput. The receiver collects Kafka broker, topic, partition, and consumer group metrics through the Kafka metrics receiver, not JMX scraping. Updated the wording.
- Removed an unused `ObservableGauge` import from the metrics example.

## Review Notes
The code examples are illustrative and still assume surrounding application types and methods such as `Order`, `serializeOrder`, `deserializeOrder`, `handleProcessingError`, and producers/consumers are defined elsewhere. OpenTelemetry messaging semantic conventions are still marked development, so future semantic-convention updates may require another pass.
