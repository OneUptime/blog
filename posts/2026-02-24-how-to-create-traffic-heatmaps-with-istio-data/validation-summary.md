# Validation Summary: How to Create Traffic Heatmaps with Istio Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio telemetry
- Prometheus and PromQL
- Grafana heatmap, table, and status history panels
- Grafana transformations
- Prometheus recording rules

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Customizing Metrics: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio Telemetry API: https://istio.io/latest/docs/reference/config/telemetry/
- Grafana Prometheus query editor: https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/
- Grafana Heatmap visualization: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/heatmap/
- Grafana Table visualization: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/table/
- Grafana Status history visualization: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/status-history/
- Grafana transformations: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The latency heatmap setup used older/ambiguous Grafana wording for histogram data. Updated it to specify the Prometheus query format as Heatmap, which Grafana documents as the format that converts cumulative histogram buckets and sorts by bucket boundary.
- The service-to-service heatmap section incorrectly suggested using a Grafana Heatmap panel for a categorical source-destination grid. Updated it to use a Table panel with the Grouping to matrix transformation, which matches Grafana's documented matrix transformation behavior.
- The source-destination grid example used `> 0`, which would turn request rates into boolean-like filtered values and lose the traffic-volume intensity. Removed that comparison so the cell values remain request rates.
- The dashboard JSON was described as a complete model and used a Heatmap panel for source-destination traffic. Changed the wording to a simplified dashboard excerpt and changed that panel to a table with matrix transformation and colored background cells.
- The time-of-day section said Prometheus does not natively support day-of-week grouping. Prometheus documents `day_of_week()` and `hour()`, so the text now notes those UTC time functions and keeps Grafana transformations as the reshaping step.
- The request-path section implied `request_url_path` is an Istio metric label. Istio standard metrics do not include that label by default. Updated the text to use a bounded custom metric dimension such as `request_operation` and added a high-cardinality caution for raw URL paths.

## Review Notes
The remaining PromQL examples use current Istio standard metric names and labels such as `istio_requests_total`, `istio_request_duration_milliseconds_bucket`, `reporter`, `source_workload`, `destination_service_name`, and `response_code`. The dashboard JSON is intentionally an excerpt, not a complete import-ready dashboard with datasource UIDs and schema metadata.
