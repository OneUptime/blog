# Validation Summary: How to Configure OpenTelemetry Collector to Export Telemetry to Apache Kafka

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Kafka exporter
- OpenTelemetry Collector Kafka receiver
- OpenTelemetry Collector filter processor and OTTL
- Apache Kafka topics, retention, compression, partitions, and consumer group offset resets

## Sources Consulted
- OpenTelemetry Collector Contrib Kafka exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Collector Contrib Kafka exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/config.go
- OpenTelemetry Collector Contrib Kafka receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/README.md
- OpenTelemetry Collector Contrib Kafka receiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/config.go
- OpenTelemetry Collector Contrib Kafka shared config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/kafka/configkafka/config.go
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry OTTL span context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspan/README.md
- Apache Kafka basic operations documentation: https://kafka.apache.org/40/operations/basic-kafka-operations/

## Issues Found
- The Kafka exporter examples used root-level `topic` and `encoding` fields. Current Kafka exporter documentation defines signal-specific `traces`, `metrics`, and `logs` blocks, so the examples were updated to put `topic` and `encoding` under the appropriate signal.
- The Kafka receiver replay example used root-level `topic` and `encoding` fields. Current Kafka receiver documentation uses signal-specific `traces.topics` and `traces.encoding`, so the replay receiver snippet was updated.
- The primary Collector config included an `attributes` processor described as adding Kafka headers, but that processor was not in any pipeline and would add telemetry attributes, not Kafka record headers. The unused and misleading processor block was removed.
- The replay instructions said to create a new consumer group and reset its offset. Kafka's consumer group reset tooling applies to inactive groups, so the wording was changed to use an inactive replay group before starting the consumer.
- The filter processor snippet used the older nested `traces.span` form and omitted the `span.` prefix required by the current OTTL span context paths. It was updated to the current `trace_conditions` style with `span.start_time_unix_nano` paths and `error_mode: ignore`.

## Review Notes
- `required_acks: all`, `producer.compression: zstd`, `producer.max_message_bytes`, `partition_traces_by_id`, `group_id`, and `initial_offset: earliest` were verified against current OpenTelemetry Collector Kafka configuration.
- The Kafka CLI examples use documented `kafka-topics.sh` topic creation flags and `kafka-consumer-groups.sh --reset-offsets` scenarios, including `--to-datetime`, `--to-earliest`, `--topic`, and `--execute`.
- The storage estimate is illustrative. Actual compressed span size varies by attribute volume, encoding, Kafka batch behavior, and compression ratio.
