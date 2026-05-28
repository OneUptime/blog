# Validation Summary: How to Correlate Metrics Logs and Traces in a Unified Investigation Workflow

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Monitoring
- Google Cloud Logging
- Cloud Trace
- Google Cloud dashboards API
- Google Cloud CLI
- OpenTelemetry Python metrics and tracing
- Python structured logging
- Log-based metrics

## Sources Consulted
- Google Cloud Logging structured logging special fields: https://cloud.google.com/logging/docs/structured-logging
- Google Cloud Logging correlated log entries: https://cloud.google.com/logging/docs/view/correlate-logs
- Google Cloud Logging query language: https://cloud.google.com/logging/docs/view/logging-query-language
- Google Cloud Logging Python automatic trace/span extraction: https://cloud.google.com/python/docs/reference/logging/latest/auto-trace-span-extraction
- Google Cloud Monitoring dashboard API examples: https://cloud.google.com/monitoring/dashboards/api-examples
- Google Cloud Monitoring dashboard REST reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Google Cloud SDK `gcloud monitoring dashboards create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Google Cloud SDK `gcloud logging metrics create` reference: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud Load Balancing metrics reference: https://cloud.google.com/load-balancing/docs/metrics
- Google Cloud Monitoring filters reference: https://cloud.google.com/monitoring/api/v3/filters
- Google Cloud Observability MQL deprecation notice: https://cloud.google.com/stackdriver/docs/deprecations/mql
- OpenTelemetry Python metrics SDK reference: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html

## Issues Found
- The exemplar section implied that any recorded metric point can link to a trace. Updated it to state that Cloud Monitoring exemplars apply to distribution-valued metrics and depend on OpenTelemetry measurements recorded in the context of a sampled span.
- The OpenTelemetry metrics snippet imported unused SDK classes and implied exporter setup was included. Removed the unused imports and clarified that the MeterProvider/exporter must be configured separately.
- The dashboard used MQL queries for new dashboard widgets. Replaced those widgets with Cloud Monitoring dashboard `timeSeriesFilterRatio` and `timeSeriesFilter` definitions, since Google no longer recommends MQL for new charts and dashboards.
- The dashboard and workflow implied that the load-balancer error-rate chart itself would expose exemplar traces. Adjusted the wording so the dashboard identifies the time window, while exemplars remain tied to instrumented histogram metrics.
- The third dashboard widget was titled "Recent Traces" but charted latency metrics, not traces. Renamed it to "P99 Backend Latency by Backend".
- The Cloud Logging query checked `labels."logging.googleapis.com/trace"`, but trace correlation is stored in the top-level `trace` LogEntry field after ingestion. Changed the existence check to `trace:*`.
- The final metrics query recommended MQL for new investigation work. Replaced it with a Cloud Monitoring filter example and added a short MQL caveat.

## Review Notes
- The `gcloud` CLI was not installed in the workspace, so command flags were verified against official Google Cloud SDK documentation rather than local `--help` output.
- The dashboard JSON snippet was extracted and validated with `jq`.
