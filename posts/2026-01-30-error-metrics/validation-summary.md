# Validation Summary: How to Build Error Metrics

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry JavaScript metrics API
- Prometheus and PromQL
- Prometheus alerting rules
- HTTP status codes
- Python error-budget, trend-analysis, and attribution examples
- SRE golden signals, SLOs, and error budgets

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry .NET metrics best practices for trace/metric correlation and cardinality: https://opentelemetry.io/docs/languages/dotnet/metrics/best-practices/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus query operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus metric and label naming best practices: https://prometheus.io/docs/practices/naming/
- Google SRE book, Monitoring Distributed Systems: https://sre.google/sre-book/monitoring-distributed-systems/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/
- RFC 9110 HTTP Semantics status code definitions: https://www.rfc-editor.org/rfc/rfc9110.html

## Issues Found
- The first OpenTelemetry histogram used milliseconds in a Prometheus-style metric name. Changed the metric to `http_request_duration_seconds` and recorded seconds to align with Prometheus base-unit guidance.
- The JavaScript ObservableGauge ratio example passed callbacks directly to `createObservableGauge`. Updated it to create the observable instruments and register callbacks with `addCallback`, matching the current OpenTelemetry JavaScript examples.
- The Python error-budget calculator derived `days_elapsed` from budget consumption, making burn rate evaluate to 1.0 for any nonzero consumption. Added `days_elapsed` as an input and calculated burn rate as actual budget consumption divided by expected consumption for elapsed time.
- The JavaScript category mapping treated HTTP 503 as a dependency failure in one snippet. Updated it to classify 503 as capacity, consistent with the post's earlier HTTP classification and RFC semantics for temporary overload/maintenance.
- The trend-analysis example could divide by zero when timestamps collapsed to the same point. Added a guard that returns a low-confidence unknown trend.
- The attribution example calculated error rates using only request counts by service, so endpoint and deployment rates could be wrong or always zero. Reworked request tracking to store endpoint and deployment dimensions when supplied.
- The complete integration example added `trace_id` as a metric label, which creates high-cardinality time series. Changed the example to avoid trace IDs in metric labels and recommend exemplars, logs, or trace attributes for drill-down correlation.
- Tightened a few type annotations, including optional attribution top contributors and optional function parameters.

## Review Notes
- Embedded Python and JavaScript snippets were syntax-checked locally: 4 Python blocks and 4 JavaScript blocks passed.
- `promtool` was not installed in the local environment, so PromQL and alert-rule syntax were reviewed against Prometheus official documentation instead of a local parser.
- The example metrics use illustrative names and simplified in-memory counters. Production implementations should prefer established semantic conventions and durable SLO-window calculations.
