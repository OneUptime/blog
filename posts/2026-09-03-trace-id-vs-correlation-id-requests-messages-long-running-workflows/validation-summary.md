# Validation Summary: Trace ID vs Correlation ID: How to Choose Identifiers for Requests, Messages, and Long-Running Workflows

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- OpenTelemetry tracing, logs, metrics, baggage, propagation, and messaging semantic conventions
- W3C Trace Context (`traceparent` and `tracestate`)
- Apache Kafka record coordinates
- RabbitMQ delivery tags
- Distributed tracing for HTTP, RPC, asynchronous messaging, retries, fan-out, and long-running workflows

## Sources Consulted

- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Tracing API](https://opentelemetry.io/docs/specs/otel/trace/api/)
- [OpenTelemetry Tracing SDK](https://opentelemetry.io/docs/specs/otel/trace/sdk/)
- [OpenTelemetry Propagators API](https://opentelemetry.io/docs/specs/otel/context/api-propagators/)
- [OpenTelemetry Baggage](https://opentelemetry.io/docs/concepts/signals/baggage/)
- [OpenTelemetry Logs Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)
- [OpenTelemetry Semantic Conventions for Messaging Spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
- [OpenTelemetry Metrics Data Model: Exemplars](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#exemplars)
- [Apache Kafka ConsumerRecord API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRecord.html)
- [RabbitMQ Consumer Acknowledgements and Publisher Confirms](https://www.rabbitmq.com/docs/confirms)

## Issues Found

- The generation rules said that the tracing SDK generates trace and span IDs unless it continues a valid trusted remote context. This could imply that a child of a remote span reuses both identifiers. Updated the rule to state that every new span receives a new span ID, root spans receive new trace IDs, and child spans inherit the trace ID from a valid parent context, including an accepted remote context.

## Review Notes

- The OpenTelemetry messaging span semantic conventions are currently marked Development. Their present guidance uses span links as the default producer-consumer correlation mechanism; using a message creation context as the parent of a processing span is permitted for single-message scenarios. The post's qualified statement that a consumer can continue a trace is consistent with that guidance.
- Message ID, causation ID, retry, and replacement-envelope behavior are application-level contracts rather than universal broker semantics. The post correctly presents them as rules that teams should define and document.
