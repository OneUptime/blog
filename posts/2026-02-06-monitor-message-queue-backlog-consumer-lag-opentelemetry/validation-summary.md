# Validation Summary: How to Monitor Message Queue Backlog and Consumer Lag with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry Python tracing API
- OpenTelemetry messaging semantic conventions
- Apache Kafka and confluent-kafka Python client
- RabbitMQ Management HTTP API
- Amazon SQS GetQueueAttributes API
- OpenTelemetry Collector configuration

## Sources Consulted
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python tracing API: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry messaging semantic conventions for Kafka: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
- OpenTelemetry messaging semantic conventions registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/
- Confluent Kafka Python API: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- RabbitMQ HTTP API reference: https://www.rabbitmq.com/docs/http-api-reference
- RabbitMQ management plugin documentation: https://www.rabbitmq.com/docs/management
- Amazon SQS GetQueueAttributes API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_GetQueueAttributes.html
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md

## Issues Found
- The RabbitMQ backlog explanation said backlog and lag were effectively the same as ready messages. Updated it to describe queue depth as the closest equivalent, split into ready and unacknowledged messages, matching RabbitMQ's documented queue fields.
- The Kafka example imported unused admin classes and passed an unused `AdminClient` into `get_committed_offsets`. Removed those pieces so the example reflects the APIs it actually uses.
- The Kafka monitor consumers did not disable auto-commit. Added `"enable.auto.commit": False` to avoid monitor clients behaving like normal committing consumers.
- The Kafka example used older/non-current OpenTelemetry attribute names such as `messaging.kafka.consumer_group` and `messaging.kafka.partition`. Updated them to `messaging.consumer.group.name` and `messaging.destination.partition.id`.
- The Kafka offset collection stored `TopicPartition` objects as dictionary keys. Changed this to a list of `(TopicPartition, offset)` pairs to avoid relying on hash behavior.
- The tracing example used older messaging attributes (`messaging.source.name` and `messaging.operation`). Updated them to current semantic convention attributes: `messaging.destination.name`, `messaging.operation.name`, and `messaging.operation.type`.
- The tracing example called `span.set_status(trace.StatusCode.ERROR, str(e))`. Updated it to pass a `trace.Status` object with `trace.StatusCode.ERROR`, matching the documented Python tracing API.
- A statement said a Kafka topic could have zero backlog from one consumer group's perspective. Updated it to say zero lag, since lag is consumer-group-specific.

## Review Notes
- All Python snippets were checked with Python AST parsing and are syntactically valid.
- The metric names in the post are custom names rather than official OpenTelemetry semantic convention metric names. That is acceptable for a practical guide, but production implementations should document their naming scheme and cardinality limits.
- The Kafka example still monitors all non-internal topic partitions and filters to committed offsets, which is workable for an illustrative example but can be expensive in large clusters. A production monitor should scope topics explicitly or use broker/exporter metrics where available.
