# Validation Summary: Why Do Multiple Queue Messages Share One Trace ID? Modeling Producer and Consumer Span Links Correctly

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- OpenTelemetry distributed tracing and messaging semantic conventions
- W3C Trace Context propagation (`traceparent`)
- Apache Kafka producer and consumer records
- RabbitMQ and AMQP 0-9-1 message metadata
- Span links, parent context selection, sampling, and SDK span limits

## Sources Consulted

- [OpenTelemetry Semantic Conventions for Messaging Spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
- [OpenTelemetry Trace API](https://opentelemetry.io/docs/specs/otel/trace/api/)
- [OpenTelemetry Tracing SDK](https://opentelemetry.io/docs/specs/otel/trace/sdk/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Apache Kafka 4.3.1 ProducerRecord API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/ProducerRecord.html)
- [Apache Kafka 4.3.1 ConsumerRecord API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRecord.html)
- [RabbitMQ AMQP 0-9-1 Model Explained](https://www.rabbitmq.com/tutorials/amqp-concepts)
- [RabbitMQ AMQP 0-9-1 Specification](https://www.rabbitmq.com/resources/specs/amqp0-9-1.pdf)

## Issues Found

- The single-message description used the imprecise phrase “producer or create span.” It now says “producer Send span or a Create span,” matching the two creation-context models defined by the messaging semantic conventions.
- The audit checklist assumed the injected parent span ID always belonged to a dedicated producer/create span. It now explicitly allows the context to come from either a producer Send span or a Create span, because OpenTelemetry recommends omitting a separate Create span for APIs that always send one message.
- The conclusion treated unique message identity as universally available. It now says “distinct message identity where available,” consistent with `messaging.message.id` being conditionally recorded only when the messaging system or application provides an identifier.

## Review Notes

- The pseudocode is intentionally language-neutral and is internally consistent with creating links before the batch Send span starts.
- The current OpenTelemetry messaging span conventions remain in Development status. Instrumentation behavior can therefore vary, and the post correctly advises checking and pinning the emitted convention version.
- OpenTelemetry defines a default `LinkCountLimit` of 128 for SDKs implementing span limits, so the warning about very large batches and truncated links is valid.
