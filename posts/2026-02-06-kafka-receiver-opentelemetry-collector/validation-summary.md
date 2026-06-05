# Validation Summary: How to Configure the Kafka Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Kafka receiver
- OpenTelemetry Collector Kafka exporter
- OpenTelemetry Collector OTLP and OTLP HTTP exporters
- Apache Kafka
- SASL/SCRAM, SASL/PLAIN, and TLS for Kafka
- Python kafka-python producer
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector Contrib Kafka receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/README.md
- OpenTelemetry Collector Contrib Kafka receiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/config.go
- OpenTelemetry Collector Kafka shared config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/kafka/configkafka/config.go
- OpenTelemetry Collector Contrib Kafka exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector logging exporter removal announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- Apache Kafka consumer group operations documentation: https://kafka.apache.org/41/operations/basic-kafka-operations/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry

## Issues Found
- Replaced removed `logging` exporter examples with the current `debug` exporter. The logging exporter was removed from officially released Collector distributions starting with v0.111.0.
- Updated Kafka receiver snippets to use signal-specific `traces`, `metrics`, and `logs` blocks with `topics` and `encoding`. Current Kafka receiver configuration defines topic/encoding per signal, and `topic` is deprecated in favor of `topics`.
- Moved Kafka TLS configuration from `auth.tls` to top-level `tls`. `auth.tls` is deprecated in the shared Kafka config.
- Changed `metadata.refresh_frequency` to `metadata.refresh_interval`, matching the current Kafka receiver/shared Kafka config.
- Changed `auto_commit` to `autocommit`, matching the current Kafka receiver config field.
- Replaced unsupported `partition_assignment_strategy` with `group_rebalance_strategies`.
- Corrected header extraction configuration from key/from mappings to the supported list of header names.
- Replaced unsupported nested `fetch.min`, `fetch.max`, and `fetch.wait_time` settings with `min_fetch_size`, `max_fetch_size`, and `max_fetch_wait`.
- Removed unsupported `consumers` receiver setting and updated the parallel processing section to describe scaling with multiple Collector instances in the same Kafka consumer group.
- Replaced unsupported `offset_retention` and misleading manual offset commit example with supported `autocommit` and `message_marking` settings.
- Updated internal Collector telemetry examples from ignored `service.telemetry.metrics.address` to the current `readers.pull.exporter.prometheus` configuration.
- Removed non-built-in Kafka consumer lag/offset metrics from the Collector metrics list and replaced them with supported Collector receiver metrics plus the optional Kafka receiver records delay metric.
- Added the missing OTLP receiver in the Kafka exporter example so the pipeline references a configured receiver.
- Updated the OneUptime integration snippet to use the current documented `otlphttp` endpoint, JSON encoding, and headers.
- Removed an unused Python import from the kafka-python example.

## Review Notes
The post is now aligned with the current OpenTelemetry Collector Contrib Kafka receiver configuration. The Kafka receiver and exporter remain beta for traces, metrics, and logs; future Collector releases may continue to change configuration around internal telemetry and Kafka client behavior.
