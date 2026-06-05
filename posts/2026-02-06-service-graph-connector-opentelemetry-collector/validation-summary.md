# Validation Summary: How to Configure the Service Graph Connector in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Service Graph Connector
- OpenTelemetry Collector Contrib Span Metrics Connector
- OpenTelemetry Collector Filter Processor
- OpenTelemetry Collector Transform Processor and OTTL
- Prometheus / PromQL
- Grafana service graph visualization

## Sources Consulted
- OpenTelemetry Collector Contrib Service Graph Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/servicegraphconnector/README.md
- OpenTelemetry Collector Contrib Service Graph Connector config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/servicegraphconnector/config.go
- OpenTelemetry Collector Contrib Span Metrics Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector Contrib Filter Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib Transform Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL functions documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- Updated all Service Graph Connector examples from deprecated `servicegraph` component IDs to the current `service_graph` component ID.
- Corrected the generated service graph histogram metric names from `traces_service_graph_request_server_seconds` to the OpenTelemetry metric name `traces_service_graph_request_server`, and added the missing client-side histogram metric.
- Replaced non-existent `traces_service_graph_unmatched_spans` and `traces_service_graph_edges` references with documented service graph metrics: `traces_service_graph_unpaired_spans_total` and `traces_service_graph_dropped_spans_total`.
- Fixed snippets that referenced `batch` without defining it.
- Fixed duplicate top-level `processors` keys in configuration snippets by merging processor definitions.
- Updated Filter Processor examples from the older `traces.span` style to current `trace_conditions` syntax, and inverted the conditions so the filter keeps the intended traces.
- Fixed the multi-environment example so each environment connector receives only traces for that environment instead of sending all traces to every connector.
- Updated the Span Metrics Connector example from deprecated `spanmetrics` to `span_metrics`, and changed its histogram and dimensions configuration to the current `histogram.explicit.buckets` and `dimensions[].name` format.
- Fixed OTTL `Concat` calls by adding the required delimiter argument.
- Replaced deprecated/ignored `service.telemetry.metrics.address` examples with current `service.telemetry.metrics.readers.pull.exporter.prometheus` configuration.
- Removed the invalid `metrics/internal` pipeline with empty receivers from the production example; Collector internal metrics are configured under `service.telemetry`.

## Review Notes
The Service Graph Connector is currently documented as alpha in OpenTelemetry Collector Contrib. Prometheus may expose histogram names with unit suffixes such as `_seconds_bucket`, while the OpenTelemetry metric name remains `traces_service_graph_request_server`.
