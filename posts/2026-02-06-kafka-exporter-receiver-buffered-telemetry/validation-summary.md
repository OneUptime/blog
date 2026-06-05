# Validation Summary: How to Use the Kafka Exporter and Kafka Receiver in the Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- Kafka exporter
- Kafka receiver
- Kafka metrics receiver
- Apache Kafka
- OTLP
- SASL/SCRAM
- TLS

## Sources Consulted
- OpenTelemetry Collector Contrib Kafka exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Collector Contrib Kafka receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/README.md
- OpenTelemetry Collector Contrib Kafka metrics receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkametricsreceiver/README.md
- Kafka exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/config.go
- Kafka shared config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/kafka/configkafka/config.go
- Kafka receiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/config.go
- Kafka metrics receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkametricsreceiver/metadata.yaml
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The Kafka exporter examples used top-level `topic` and `encoding` fields. Current exporter configuration defines signal-specific `traces`, `metrics`, and `logs` blocks with `topic` and `encoding`, so the examples were updated.
- The producer comment said `flush_max_messages` waits up to 10ms. In current Kafka producer config, `linger` controls the wait time and `flush_max_messages` controls the maximum messages per broker request. Added `linger: 10ms`.
- The Kafka receiver examples used deprecated top-level `topic` and `encoding` fields. Current receiver configuration uses signal-specific `traces`, `metrics`, and `logs` blocks with `topics` and `encoding`, so the examples were updated.
- The receiver comment described `initial_offset: earliest` as "earliest unread offset." It only applies when the consumer group has no committed offset, so the comment was corrected.
- The receiver comment described `session_timeout` as the number of parallel consumers. It is the consumer group session timeout used to detect failed members, so the comment was corrected.
- The authentication example placed TLS under `auth.tls`, which is deprecated. Moved TLS to top-level `tls`.
- The encoding list used `jaeger` and `zipkin`, which are not current built-in Kafka receiver encoding names. Updated the list to `jaeger_proto`, `jaeger_json`, `zipkin_proto`, and `zipkin_json`.
- The monitoring section referenced `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0, and referenced a non-current `kafka_receiver_partition_lag` metric. Replaced this with a `kafka_metrics` receiver example and the current lag metrics `kafka.consumer_group.lag` and `kafka.consumer_group.lag_sum`.

## Review Notes
The overall buffered Collector-to-Kafka-to-Collector pattern is technically sound. For production hardening, future revisions could mention Kafka topic retention, replication factor, producer acknowledgements, and Collector retry/queue behavior, but those are enhancements rather than correctness fixes.
