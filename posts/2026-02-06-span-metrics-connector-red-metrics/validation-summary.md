# Validation Summary: How to Configure the Span Metrics Connector for RED Metrics

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Span Metrics Connector
- OpenTelemetry Collector Service Graph Connector
- OpenTelemetry Collector Filter, Transform, Batch, Resource, and Memory Limiter processors
- OTLP and Prometheus exporters
- PromQL RED metric alerting

## Sources Consulted
- OpenTelemetry Collector Contrib Span Metrics Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector Contrib Filter Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib Transform Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Service Graph Connector package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/servicegraphconnector
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector connectors registry: https://opentelemetry.io/docs/collector/components/connector/
- Prometheus `histogram_quantile()` documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Referenced OneUptime service graph article: https://oneuptime.com/blog/post/2026-02-06-service-graph-connector-opentelemetry-collector/view

## Issues Found
- The post used the deprecated `spanmetrics` connector component name throughout. Updated configuration examples to use `span_metrics`, which is the current component name documented by OpenTelemetry Collector Contrib.
- Span Metrics examples used the old `latency_histogram_buckets` field. Updated Span Metrics configurations to use `histogram.explicit.buckets`.
- The post described generated metrics as only `calls_total` and `duration_milliseconds`. Updated the explanation to the current OpenTelemetry metric names (`traces.span.metrics.calls` and `traces.span.metrics.duration`) while keeping Prometheus query examples in Prometheus-normalized form.
- Filter processor examples used deprecated nested `traces.span` syntax and filtered in the wrong direction. Updated them to current `trace_conditions` syntax and inverted conditions so the processor drops non-matching spans rather than dropping the spans intended to be kept.
- One filtering example had duplicate top-level `processors:` keys in the same YAML block. Merged `batch` into the existing processors map.
- Transform processor examples used old/bare OTTL paths such as `attributes[...]` and `name`. Updated them to current `span.attributes[...]`, `resource.attributes[...]`, and `span.name` paths.
- The status-code class transform used an invalid `Concat([Substring(...)])` expression for the documented Transform processor syntax and did not account for numeric HTTP status codes. Replaced it with explicit numeric range-based class assignments.
- `dimensions_cache_size` was used for cardinality control even though the Span Metrics docs mark it deprecated. Replaced it with `aggregation_cardinality_limit` and corrected the related comments.
- The production and monitoring snippets used `service.telemetry.metrics.address`, which current Collector docs say is ignored as of v0.123.0. Updated them to configure the internal Prometheus endpoint with `service.telemetry.metrics.readers.pull.exporter.prometheus`.
- The Service Graph example used the deprecated `servicegraph` component name after current docs note the rename to `service_graph`. Updated that example while preserving the Service Graph-specific `latency_histogram_buckets` field.
- PromQL error-rate examples mixed span status and HTTP status labels. Updated the generic error-rate query to use the span status label (`status_code="STATUS_CODE_ERROR"`) and the endpoint-specific query to use the generated `http_status_class="5xx"` label.

## Review Notes
- The Span Metrics Connector is still documented as alpha, and its docs note upcoming/default-unit behavior around duration metrics. Teams should test generated metric names and units against their exact Collector distribution and Prometheus translation settings.
- No `otelcol` or `otelcol-contrib` binary was installed in the local workspace, so the updated examples were reviewed against official documentation and checked for local consistency, but not executed with `otelcol --config`.
