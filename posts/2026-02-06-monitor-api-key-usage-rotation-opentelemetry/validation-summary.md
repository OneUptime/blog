# Validation Summary: How to Monitor API Key Usage and Rotation Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python API
- OpenTelemetry metrics and traces
- Flask middleware
- Prometheus alerting rules and PromQL
- API key security monitoring

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry Prometheus compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus histogram and summary best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus PromQL function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile

## Issues Found
- The `create_observable_gauge` callback returned a raw numeric value. OpenTelemetry Python asynchronous metric callbacks should return or yield `Observation` instances, so the example now imports `CallbackOptions` and `Observation` and defines `observe_keys_near_expiry`.
- The metric unit strings used `"requests"` and `"days"`. OpenTelemetry recommends UCUM-style units, so the request counter now uses `unit="1"` and the key age histogram now uses `unit="d"`.
- The Prometheus `histogram_quantile` alert used `api_key_age_days_bucket` directly. Prometheus documentation recommends applying `rate()` over a time window and aggregating classic histogram buckets by `le`, so the alert now uses `histogram_quantile(0.95, sum by (le) (rate(api_key_age_days_bucket[1h]))) > 90`.

## Review Notes
The examples are illustrative and assume application-specific helpers such as `db`, `count_keys_near_expiry`, `generate_api_key`, and `calculate_expiry`. The use of `owner` and `key_prefix` as metric attributes may be acceptable for small controlled systems, but larger deployments should watch metric cardinality and avoid exposing sensitive key material in telemetry.
