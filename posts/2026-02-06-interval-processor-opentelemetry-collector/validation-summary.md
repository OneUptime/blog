# Validation Summary: How to Configure the Interval Processor in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Interval Processor
- OpenTelemetry Collector Filter Processor
- OpenTelemetry Collector Debug Exporter
- OpenTelemetry Collector internal telemetry
- Kubernetes ConfigMap, Deployment, and Service manifests
- YAML configuration

## Sources Consulted
- OpenTelemetry Collector processor registry: https://opentelemetry.io/docs/collector/components/processor/
- Interval Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/intervalprocessor
- Interval Processor config schema: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/processor/intervalprocessor/config.schema.yaml
- Interval Processor implementation: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/processor/intervalprocessor/processor.go
- Filter Processor README and schema: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- Debug Exporter README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/debugexporter
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The post described unsupported interval processor configuration fields: `aggregation`, `include`, `exclude`, `resource_attributes`, `metric_attributes`, `debug`, and `max_buffered_metrics`. Removed those fields and replaced examples with the supported `interval` and `pass_through` settings.
- The post claimed the processor supports configurable gauge strategies (`first`, `last`, `min`, `max`, `mean`), sum strategies (`cumulative`, `delta`), and histogram bucket merging. Updated the explanation to reflect the current implementation: it keeps the newest data point per metric stream and exports it at the configured interval.
- The post implied all sums and histograms are aggregated. Clarified that only monotonically increasing cumulative sums and cumulative histograms/exponential histograms are aggregated; delta metrics and non-monotonic sums pass through unchanged.
- Metric-specific interval examples put include/exclude filters on the interval processor. Reworked them to use separate pipelines with current OTTL-based Filter processor `metric_conditions`.
- The production and Kubernetes examples used the deprecated `logging` exporter and `loglevel` option. Replaced them with the current `debug` exporter and `verbosity` option.
- The Kubernetes manifest used `otel/opentelemetry-collector-contrib:0.93.0`, which predates the currently documented interval processor configuration. Updated the example image and `COLLECTOR_VERSION` to `0.153.0`, the current release identified during review.
- The Kubernetes health probes referenced port `13133` without configuring the `health_check` extension in the collector config or exposing the container port. Added the extension and container port.
- The monitoring section listed interval-specific internal metrics that are not documented in current Collector internal telemetry. Replaced them with general Collector internal telemetry guidance.
- The validation log example showed exact interval aggregation log messages that are not documented and should not be relied on. Replaced it with debug exporter inspection guidance.
- The description claimed reduced cardinality. Updated it to reduced data volume, since the interval processor reduces export frequency but does not inherently reduce time-series cardinality.

## Review Notes
- The interval processor is marked alpha for metrics and has a statefulness warning in the official component registry.
- The Filter processor's older `metrics.include` / `metrics.exclude` syntax is still present in the schema but deprecated in current documentation; the post now uses `metric_conditions`.
- Debug exporter output format is explicitly unstable, so examples should avoid depending on exact log lines.
