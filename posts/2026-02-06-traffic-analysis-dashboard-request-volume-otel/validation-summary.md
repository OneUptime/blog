# Validation Summary: How to Build a Traffic Analysis Dashboard with Request Volume

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry HTTP semantic conventions
- OpenTelemetry Collector
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector Prometheus Remote Write exporter
- OpenTelemetry Span Metrics Connector
- Prometheus / PromQL
- Grafana dashboards, Node Graph panel, and template variables

## Sources Consulted
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusremotewriteexporter
- OpenTelemetry Collector Span Metrics Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/spanmetricsconnector
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana Node Graph panel documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/node-graph/

## Issues Found
- The post said the SDK automatically records `http.server.request.duration`. Updated this to refer to OpenTelemetry HTTP server instrumentation, because the metric is emitted by appropriate instrumentation rather than every SDK by default.
- The attribute list implied all listed attributes are always present. Changed the wording to "commonly useful attributes" and noted that `server.address` is instrumentation-dependent/opt-in.
- The Collector text mentioned `metricstransform`, but the example used filtering and did not define a metric transform. Changed the text to describe the `filter` processor.
- The filter processor example used the legacy `metrics.datapoint` configuration shape. Updated it to current `metric_conditions` syntax with `datapoint.attributes[...]` and `error_mode: ignore`.
- The Prometheus Remote Write exporter used the deprecated `prometheusremotewrite` component name. Updated it to `prometheus_remote_write`.
- The PromQL examples grouped by `service_name`, but resource attributes are not generally available as normal metric labels unless copied into labels or joined through `target_info`. Added `resource_to_telemetry_conversion.enabled: true` to make those queries work as written.
- The status-code query comment said it grouped by status code class, but the query grouped by exact status code. Corrected the comment.
- The comparison heading said hour-over-hour while the query used `offset 1d`. Renamed it to day-over-day.
- The week-over-week query compares the current one-hour rate window with the same hour seven days earlier, not total weekly traffic. Clarified the heading, comment, and explanation.
- The Span Metrics Connector statement implied `peer.service` is available automatically. Clarified that `peer.service` should be configured as an additional dimension.
- The Grafana variable example used deprecated classic `label_values(metric, label)` syntax. Updated it to the current query variable fields for label values.

## Review Notes
The PromQL examples are syntactically valid. In Grafana panels, using `$__rate_interval` instead of a fixed `[5m]` range can improve behavior across dashboard time ranges, but the fixed window is still valid PromQL and was left unchanged.
