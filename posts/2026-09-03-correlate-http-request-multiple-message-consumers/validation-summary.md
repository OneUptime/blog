# Validation Summary: How to Correlate One HTTP Request with Multiple Message Consumers at Both Request and Message Level

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- W3C Trace Context (`traceparent` and `tracestate`)
- OpenTelemetry tracing, span links, context propagation, semantic conventions, baggage, and exemplars
- Distributed tracing across HTTP and asynchronous messaging
- Apache Kafka consumer groups and records
- RabbitMQ exchanges, queues, subscriptions, acknowledgements, retries, and dead-letter workflows
- Correlation IDs, message IDs, workflow IDs, structured logs, and metric dimensions

## Sources Consulted

- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Semantic Conventions for Messaging Spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
- [OpenTelemetry Trace API](https://opentelemetry.io/docs/specs/otel/trace/api/)
- [OpenTelemetry Baggage](https://opentelemetry.io/docs/concepts/signals/baggage/)
- [OpenTelemetry Metrics Data Model: Exemplars](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#exemplars)
- [Apache Kafka ConsumerRecord API 4.3](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRecord.html)
- [Apache Kafka Consumer Design](https://kafka.apache.org/documentation/#consumerdesign)
- [RabbitMQ Exchanges](https://www.rabbitmq.com/docs/exchanges)
- [RabbitMQ Queues: Consumers and Acknowledgements](https://www.rabbitmq.com/docs/queues#consumers)
- [RabbitMQ Reliability Guide](https://www.rabbitmq.com/docs/reliability)
- [RabbitMQ AMQP 0-9-1 Protocol Specification](https://www.rabbitmq.com/resources/specs/amqp0-9-1.pdf)

## Issues Found
No technical issues found.

## Review Notes

- The code block is language-neutral pseudocode, not a directly runnable example for a specific OpenTelemetry SDK. Its ordering correctly makes each create span current while injecting into a fresh per-message carrier.
- OpenTelemetry messaging semantic conventions are currently marked Development. The post already warns readers to verify emitted attributes and pin instrumentation versions.
- The conventions recommend links from consumer process/receive spans to every applicable message creation context. They permit the creation context to be the parent only for single-message process scenarios, matching the post.
- Attempt numbering and fields such as `original_message_id` are application-level modeling choices rather than portable OpenTelemetry semantic-convention attributes. The post presents them as metadata and lineage policy, not standardized field names.
- The Kafka 4.3 API URL and RabbitMQ AMQP 0-9-1 specification URL resolve to the intended official resources.
