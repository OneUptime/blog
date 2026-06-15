# Validation Summary: How to Use Explore for Ad-Hoc Queries in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Explore
- Prometheus and PromQL
- Grafana Loki and LogQL
- Grafana Tempo and TraceQL
- Grafana Query inspector
- Grafana correlations, split view, sharing, and export workflows

## Sources Consulted
- Grafana Explore documentation: https://grafana.com/docs/grafana/latest/visualizations/explore/
- Grafana Get started with Explore: https://grafana.com/docs/grafana/latest/visualizations/explore/get-started-with-explore/
- Grafana Query management in Explore: https://grafana.com/docs/grafana/latest/visualizations/explore/query-management/
- Grafana Query inspector in Explore: https://grafana.com/docs/grafana/latest/visualizations/explore/explore-inspector/
- Grafana Logs in Explore: https://grafana.com/docs/grafana/latest/visualizations/explore/logs-integration/
- Grafana Traces in Explore: https://grafana.com/docs/grafana/latest/visualizations/explore/trace-integration/
- Grafana Correlations Editor in Explore: https://grafana.com/docs/grafana/latest/visualizations/explore/correlations-editor-in-explore/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus aggregation operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Grafana Loki LogQL query documentation: https://grafana.com/docs/loki/latest/query/
- Grafana Loki LogQL reference: https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/
- Grafana Tempo TraceQL query construction: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- Grafana Tempo TraceQL query editor: https://grafana.com/docs/tempo/latest/traceql/query-editor/
- Grafana Tempo TraceQL performance guidance: https://grafana.com/docs/tempo/latest/traceql/tune-traceql-queries/

## Issues Found
- Fixed PromQL aggregation placement. Several examples used `rate(...[5m]) by (...)`, which is not valid PromQL because `by` belongs to aggregation operators such as `sum by (...) (...)`, not to `rate()`. Updated those examples to use `sum by (...)`.
- Fixed PromQL histogram quantile examples. For classic histograms, useful aggregation must preserve the `le` label before calling `histogram_quantile()`. Updated latency examples to use `sum by (..., le)`.
- Fixed TraceQL selectors. The examples used unscoped attributes such as `service.name`, `http.status_code`, and `duration`. Updated them to scoped TraceQL fields such as `resource.service.name`, `span.http.status_code`, and `trace:duration`.
- Fixed split-view time synchronization wording. Time ranges only stay synchronized when the time pickers are linked, so the post now says to link them.
- Fixed Query inspector terminology. Grafana Explore uses Query, Stats, JSON, Data, and Error tabs rather than separate Request and Response tabs. The post now describes the Query tab behavior.
- Fixed Explore share URL format. Current Grafana Explore URLs use a `panes` parameter with `schemaVersion`, and the panes value should be URL-encoded.
- Fixed export-result claims. Query inspector supports CSV for data frames, TXT for logs, and JSON for traces, so the export bullets now match Grafana documentation.
- Replaced the incorrect "Annotations" Explore section with Correlations, which are supported directly from Explore via the Add menu.
- Updated query history wording to match current Grafana documentation.

## Review Notes
The examples use placeholder metric and label names such as `http_requests_total`, `service`, and `target_service`; those are syntactically valid but depend on an environment's instrumentation conventions. The post does not pin a Grafana, Loki, Tempo, or Prometheus version, so the review was performed against the latest official documentation available on 2026-06-15.
