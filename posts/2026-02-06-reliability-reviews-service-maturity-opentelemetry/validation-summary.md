# Validation Summary: How to Use OpenTelemetry Data to Drive Reliability Reviews

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry metrics
- OpenTelemetry Collector
- Prometheus and PromQL
- Prometheus remote write
- Python
- YAML
- Service reliability reviews and SLO scoring

## Sources Consulted
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry HTTP semantic convention migration notes: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.0/querying/api/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/3.4/querying/functions/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/3.1/querying/operators/
- Prometheus querying basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus remote write specification: https://prometheus.io/docs/specs/prw/remote_write_spec/
- Prometheus OpenTelemetry guide: https://prometheus.io/docs/guides/opentelemetry/

## Issues Found
- The Python maturity scorer referenced `_evaluate_threshold` but did not define it. Added a small threshold evaluator for boolean and numeric threshold expressions so the scorer can run as shown.
- Several metrics listed in the maturity model were not mapped in `_get_metric_value`, which made those criteria always evaluate to `False`. Added mappings for all maturity-model metrics.
- The trace coverage query used stale/inconsistent HTTP metric names and compared two request-count sources in a way that would not reliably measure uninstrumented endpoints. Replaced it with a direct `otel_trace_coverage_pct` maturity metric query matching the model.
- The MTTR histogram query used `histogram_quantile` without preserving the required `le` label for classic Prometheus histograms. Updated it to aggregate with `sum by (le)`.
- The OpenTelemetry gauge used `unit="level"`, which is not a UCUM-style dimensionless unit. Changed it to `unit="1"`.
- The counter attribute stored `"passed"` as a string. Changed it to a boolean attribute, which is supported by the OpenTelemetry API.
- The report example used `datetime.utcnow()` and referenced an undefined `load_previous_review()`. Updated it to use `datetime.now(timezone.utc)` and accept `previous_scores` as an optional parameter.
- The maturity distribution PromQL used `count by (service_name)`, which returns per-service series rather than level distribution counts. Updated the examples to count services at each level.

## Review Notes
The Collector configuration shape is valid for OTLP metrics flowing through the resource and batch processors to the Prometheus remote write exporter. The Prometheus remote write endpoint still requires a compatible receiver to be enabled/configured on the Prometheus-compatible backend.
