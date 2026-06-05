# Validation Summary: How to Monitor Apache Kafka Consumer Lag with the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Apache Kafka
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib `kafka_metrics` receiver
- OpenTelemetry Collector processors and exporters
- Prometheus / PromQL alerting
- OpenTelemetry messaging semantic conventions
- Java OpenTelemetry tracing API

## Sources Consulted
- OpenTelemetry Collector Contrib Kafka Metrics Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkametricsreceiver/README.md
- OpenTelemetry Collector Contrib Kafka Metrics Receiver generated documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkametricsreceiver/documentation.md
- OpenTelemetry Collector Contrib Kafka Metrics Receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkametricsreceiver/metadata.yaml
- OpenTelemetry Collector Contrib Group By Attributes Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/groupbyattrsprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry semantic conventions for Kafka: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
- Apache Kafka `KafkaConsumer` Javadoc: https://kafka.apache.org/40/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus instrumentation best practices: https://prometheus.io/docs/practices/instrumentation/

## Issues Found
- The post used the deprecated `kafkametrics` receiver type. Updated Collector examples and prose to use the current `kafka_metrics` component name.
- The production receiver configuration placed TLS under `auth.tls`, which is deprecated for this receiver. Moved TLS settings to the receiver's top-level `tls` block.
- The post listed `kafka.topic.partitions.current_offset`, which is not emitted by the current receiver. Replaced it with `kafka.partition.current_offset` and updated the PromQL metric name to `kafka_partition_current_offset`.
- The post described log end offset and committed offset as the latest produced message and last consumed message. Clarified that Kafka offsets represent positions: log end offset is the next offset after the latest message, and the committed offset is the next offset the group will read.
- Several PromQL examples used `rate()` on Kafka receiver gauge metrics. Replaced growth-rate examples with `deriv()` and changed the stalled-consumer alert to compare `max_over_time()` and `min_over_time()` over the offset gauge.
- The tracing example used older Kafka semantic convention attributes (`messaging.kafka.consumer.group` and `messaging.kafka.partition`). Updated these to `messaging.consumer.group.name` and `messaging.destination.partition.id`.
- The tracing example used a non-standard `messaging.kafka.message.age_ms` attribute. Renamed it to the custom `kafka.message.age_ms` attribute and described it as custom.
- The high-volume configuration claimed `groupbyattrs` aggregates metric values. Replaced it with the receiver's built-in `kafka.consumer_group.lag_sum` / `kafka.consumer_group.offset_sum` totals and metric disabling for per-partition series.
- The Collector self-monitoring snippet used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Updated it to the current Prometheus pull reader configuration.

## Review Notes
- The `kafka_metrics` receiver is in the contrib distribution and its emitted Kafka metrics are currently marked development stability in the generated metadata, even though the receiver signal support is beta.
- The PromQL examples assume the backend exports OTLP metric names in Prometheus underscore form.
