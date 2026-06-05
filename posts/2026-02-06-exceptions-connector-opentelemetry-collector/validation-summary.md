# Validation Summary: How to Configure the Exceptions Connector in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- Exceptions Connector
- Count Connector
- Routing Connector
- Filter Processor
- Transform Processor and OTTL
- Probabilistic Sampler Processor
- OTLP and OTLP/HTTP exporters
- Loki OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector connectors list: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- Exceptions Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/exceptionsconnector
- Exceptions Connector source/config: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/exceptionsconnector
- Count Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/countconnector
- Routing Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/routingconnector
- Filter Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- Transform Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OTTL function reference: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/ottlfuncs
- Probabilistic Sampler Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/probabilisticsamplerprocessor
- Tail Sampling Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- Loki exporter deprecation/removal issue: https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/33916

## Issues Found
- The flow diagram implied the Exceptions Connector passes non-exception spans through to a trace exporter. Updated it to show trace export as a separate exporter from the traces pipeline.
- The filter processor examples used older `logs.exclude.record_attributes` syntax. Updated them to current `log_conditions` OTTL syntax.
- Several transform processor examples used unqualified log paths such as `attributes[...]` and `body`, plus invalid `len(...)` calls. Updated them to `log.attributes[...]`, `log.body`-appropriate fields, and `Len(...)`.
- Several `Concat(...)` OTTL calls omitted the required delimiter argument. Added delimiters and nil guards.
- The routing example used the deprecated routing processor shape. Reworked it to use the current routing connector with `default_pipelines`, `table`, `condition`, and destination pipelines.
- The sampling example placed `tail_sampling` in a logs pipeline, but tail sampling is a traces processor. Removed that use and used the logs-capable probabilistic sampler with `sampling_priority`.
- The Loki exporter examples used the removed/deprecated `loki` exporter and removed label configuration. Updated them to use `otlphttp/loki` for Loki OTLP ingestion.
- The production telemetry example used `service.telemetry.metrics.address`, which current docs say is ignored as of Collector v0.123.0. Updated it to a Prometheus pull reader.

## Review Notes
Validated the basic and production Collector configurations with `otelcol-contrib` v0.153.0. Later examples that intentionally omit shared sections were checked with temporary receiver/exporter scaffolding to confirm the corrected processor and connector syntax parses successfully.
