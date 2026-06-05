# Validation Summary: How to Track Reliability Debt and Prioritize Fixes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry OTLP metrics exporter
- OpenTelemetry Collector OTLP receiver, resource processor, batch processor, and OTLP exporter
- OpenTelemetry HTTP semantic conventions
- SRE error budgets and burn rate calculations
- Python datetime handling

## Sources Consulted
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python SDK metrics export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.export.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector resource processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourceprocessor
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/

## Issues Found
- The request attribution example used the older `http.status_code` attribute. Updated it to the stable OpenTelemetry semantic convention attribute `http.response.status_code`.
- The `budget_attribution.py` snippet referenced counters from the previous snippet without importing them. Added an import from `sli_metrics` so the example can run as written.
- The burn-rate calculation set `window_start = now - timedelta(days=window_days)`, which made `elapsed_fraction` always evaluate to 1 for the queried window and broke projected consumption for an in-progress SLO window. Changed the function to accept `window_start`, derive `window_end`, and calculate elapsed fraction from the actual SLO window.
- The burn-rate example returned `None` when no requests were present but annotated the function as always returning `BurnRateResult`. Updated the annotation to `Optional[BurnRateResult]` and made `budget_exhaustion_time` optional.
- The burn-rate example used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(timezone.utc)`.
- The Collector section said it used resource detection, but the snippet configured the `resource` processor. Updated the wording to match the configuration.
- The Collector `resource` processor attempted to use `from_attribute: DEPLOYMENT_ENV` and `from_attribute: SERVICE_VERSION`, which copies existing telemetry attributes rather than reading environment variables. Replaced these with `value: ${env:DEPLOYMENT_ENV:-unknown}` and `value: ${env:SERVICE_VERSION:-unknown}`.

## Review Notes
The examples are technically valid as illustrative code, but the `metrics_store` API is pseudocode and would need to be implemented with a real metrics backend such as Prometheus, ClickHouse, or another time-series store.
