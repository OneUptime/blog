# Validation Summary: How to Configure the Signal to Metrics Connector in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector connectors
- Signal to Metrics connector
- OpenTelemetry Transformation Language (OTTL)
- OTLP receiver
- Prometheus Remote Write exporter

## Sources Consulted
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Signal to Metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/signaltometricsconnector/README.md
- Signal to Metrics connector metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/signaltometricsconnector/metadata.yaml
- Signal to Metrics connector config schema: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/signaltometricsconnector/config/config.go
- OTTL span context documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlspan

## Issues Found
- The post used the deprecated `signaltometrics` component type throughout. Updated examples to the current `signal_to_metrics` type. The deprecated alias still exists, but the current documented type is `signal_to_metrics`.
- The configuration examples used unsupported fields such as `dimensions`, `source`, `scope`, `mapping`, `value`, `aggregation`, `resource_filters`, `rate`, and `percentiles`. Replaced them with the documented Signal to Metrics schema: `attributes`, `include_resource_attributes`, `conditions`, and exactly one of `sum`, `gauge`, `histogram`, or `exponential_histogram`.
- The post described stateful aggregation windows, rates, and percentile calculation in the connector. The official connector README states that Signal to Metrics does not perform stateful or time-based aggregations. Updated the temporal section to explain that rates and percentiles should be calculated in the metrics backend from sums and histograms.
- Several OTTL conditions treated span kind and status as ordinary attributes. Updated them to use documented span context paths and enum constants such as `span.kind == SPAN_KIND_SERVER` and `span.status.code == STATUS_CODE_ERROR`.
- Log examples attempted to use top-level log severity fields as metric attributes. Updated log examples to use severity in OTTL `conditions` and log/resource attributes in `attributes` and `include_resource_attributes`.
- The internal telemetry example used the deprecated/ignored `service.telemetry.metrics.address` form. Updated it to the current `metrics.readers.pull.exporter.prometheus.host` and `port` configuration.
- The listed connector-specific internal metrics appeared to be invented. Replaced them with documented Collector pipeline health metrics such as receiver accepted spans and exporter sent/failed metric points.

## Review Notes
The Signal to Metrics connector is currently alpha in the contrib distribution, and its schema is OTTL-based. The examples were corrected against the current upstream documentation and source schema, but a production guide should still pin a Collector version because contrib component behavior can change between releases.
