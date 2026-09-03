# Validation Summary: How to Preserve Signal Correlation Across Retries, Dead-Letter Queues, and Redeliveries

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- OpenTelemetry distributed tracing and semantic conventions
- W3C Trace Context (`traceparent` and `tracestate`)
- Apache Kafka delivery semantics, transactions, records, and headers
- RabbitMQ redelivery, acknowledgements, requeueing, and dead-letter exchanges
- Correlation IDs, message lineage, idempotency, retries, and replay

## Sources Consulted

- [OpenTelemetry Semantic Conventions for Messaging Spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
- [OpenTelemetry Messaging Attribute Registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/)
- [OpenTelemetry Trace API: Links](https://opentelemetry.io/docs/specs/otel/trace/api/#link)
- [W3C Trace Context Recommendation](https://www.w3.org/TR/trace-context/)
- [Apache Kafka Design: Message Delivery Semantics and Transactions](https://kafka.apache.org/43/design/design/#message-delivery-semantics)
- [Apache Kafka ConsumerRecord API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRecord.html)
- [RabbitMQ Reliability Guide](https://www.rabbitmq.com/docs/reliability)
- [RabbitMQ Dead Letter Exchanges](https://www.rabbitmq.com/docs/dlx)

## Issues Found

- The RabbitMQ dead-letter metadata description named only the AMQP 0.9.1 `x-death` representation, which could imply that it applies unchanged to AMQP 1.0. Updated the sentence to distinguish the AMQP 0.9.1 headers from the AMQP 1.0 `x-opt-deaths` and first/last-death message annotations.

## Review Notes

- The OpenTelemetry messaging semantic conventions remain Development status, as the post states. Attribute names and emitted conventions can vary with instrumentation and semantic-convention versions, so pinning versions is appropriate.
- The retry publishing snippet is language-neutral pseudocode rather than a directly executable SDK example; its sequencing is technically sound, but concrete method names depend on the selected OpenTelemetry SDK and messaging client.
- The Kafka links target the Kafka 4.3 documentation, so the `ConsumerRecord` mutability and thread-safety wording is version-specific.
