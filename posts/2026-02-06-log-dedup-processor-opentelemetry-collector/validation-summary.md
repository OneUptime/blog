# Validation Summary: How to Configure the Log Dedup Processor in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib log deduplication processor
- OpenTelemetry Collector transform, attributes, memory limiter, batch, and probabilistic sampler processors
- OTLP gRPC receiver
- OTLP HTTP exporter
- Collector internal telemetry metrics
- OneUptime log ingestion

## Sources Consulted
- OpenTelemetry Collector Contrib log deduplication processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/logdedupprocessor/README.md
- OpenTelemetry Collector Contrib log deduplication processor config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/logdedupprocessor/config.go
- OpenTelemetry Collector Contrib log deduplication processor counter source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/logdedupprocessor/counter.go
- OpenTelemetry Collector Contrib log deduplication processor telemetry source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/logdedupprocessor/internal/metadata/generated_telemetry.go
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector probabilistic sampler processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry Collector batch processor config source: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/config.go
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector configuration docs for environment variable substitution: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The post used the deprecated processor type `logdedup`. Updated examples and text to use the current `log_dedup` processor type.
- The post used unsupported `log_record_key`, `count_attribute`, `first_occurrence_attribute`, and `last_occurrence_attribute` fields. Replaced them with supported `conditions`, `include_fields`, and `log_count_attribute` usage, and documented the built-in `first_observed_timestamp` and `last_observed_timestamp` attributes.
- Several examples implied deduplication could be keyed directly by arbitrary resource paths. Updated the explanation because the processor groups by resource attributes by default, while `include_fields` and `exclude_fields` apply only to log body map fields and log attributes.
- The filtering example used outdated include-style filter processor configuration. Replaced it with the log dedup processor's `conditions`, which deduplicate matching logs while passing non-matching logs through unchanged.
- The multi-pipeline interval example would duplicate non-matching logs because each pipeline receives the same input. Reworked it into a single pipeline with chained `log_dedup` processors using different `conditions`.
- The transform example used unprefixed `body` paths. Updated the OTTL statements to use `log.body` and guard them with `IsString(log.body)`.
- The monitoring section listed non-existent log dedup metrics and used the ignored `service.telemetry.metrics.address` setting. Updated it to use `service.telemetry.metrics.readers` with a Prometheus pull exporter and the actual `otelcol_dedup_processor_aggregated_logs` metric plus standard processor incoming/outgoing item metrics.
- The OTLP HTTP exporter examples used the deprecated `otlphttp` alias and set `endpoint` to a signal-specific URL. Updated them to `otlp_http` with `logs_endpoint`.
- The Collector environment variable examples used `${ONEUPTIME_TOKEN}`. Updated them to the documented `${env:ONEUPTIME_TOKEN}` syntax.
- The batch processor examples set `send_batch_max_size: 1024` without lowering `send_batch_size`, which is invalid because the default send batch size is 8192. Updated examples to use `send_batch_size: 1024`.

## Review Notes
The log deduplication processor is alpha for logs in the OpenTelemetry Collector Contrib distribution. The YAML snippets were parsed successfully, but a local `otelcol` or `otelcol-contrib` binary was not available for full runtime config validation.
