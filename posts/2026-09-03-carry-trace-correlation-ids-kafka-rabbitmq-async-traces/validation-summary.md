# Validation Summary: How to Carry Trace and Correlation IDs Through Kafka or RabbitMQ Without Breaking Async Traces

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- OpenTelemetry distributed tracing and messaging semantic conventions
- W3C Trace Context (`traceparent` and `tracestate`)
- W3C Baggage
- Apache Kafka record headers, producers, consumers, and acknowledgements
- RabbitMQ and AMQP 0-9-1 message properties, publisher confirms, redelivery, and dead lettering
- Application correlation, message, and causation identifiers

## Sources Consulted

- [OpenTelemetry Semantic Conventions for Messaging Spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
- [OpenTelemetry Trace API: Links](https://opentelemetry.io/docs/specs/otel/trace/api/#link)
- [OpenTelemetry Context Propagation API](https://opentelemetry.io/docs/specs/otel/context/api-propagators/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [W3C Baggage](https://www.w3.org/TR/baggage/)
- [Apache Kafka ProducerRecord 4.3 API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/ProducerRecord.html)
- [Apache Kafka ConsumerRecord 4.3 API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRecord.html)
- [Apache Kafka Producer Configuration](https://kafka.apache.org/documentation/#producerconfigs_acks)
- [RabbitMQ AMQP 0-9-1 Protocol](https://www.rabbitmq.com/amqp-0-9-1-protocol)
- [RabbitMQ Consumer Acknowledgements and Publisher Confirms](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ Reliability Guide](https://www.rabbitmq.com/docs/reliability)
- [RabbitMQ Dead Letter Exchanges](https://www.rabbitmq.com/docs/dlx)

## Issues Found
No technical issues found.

## Review Notes
The code blocks are intentionally language-neutral pseudocode, so concrete propagator, carrier getter/setter, context, and span APIs must be mapped to the selected OpenTelemetry language SDK. The post correctly labels the OpenTelemetry messaging semantic conventions as Development and advises pinning instrumentation behavior. Kafka API links currently resolve to the Kafka 4.3 documentation; the described record-header APIs remain valid there.
