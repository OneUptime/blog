# Validation Summary: How to Track API Consumer Usage Patterns with OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry metrics and traces
- OpenTelemetry JavaScript API
- TypeScript / Node.js middleware examples
- Prometheus and PromQL
- HTTP semantic conventions
- API consumer usage analytics

## Sources Consulted
- OpenTelemetry JavaScript API reference, Meter interface: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Meter.html
- OpenTelemetry HTTP semantic conventions for metrics: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry HTTP semantic conventions stability announcement: https://opentelemetry.io/blog/2023/http-conventions-declared-stable/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus histogram and summary query guidance: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The usage metrics snippet used older HTTP semantic convention attribute names, `http.method` and `http.status_code`. Updated them to the current stable names, `http.request.method` and `http.response.status_code`.
- The response-size histogram was named `api.usage.response_size_bytes` while also declaring `unit: 'bytes'`. Updated the OpenTelemetry instrument name to `api.usage.response_size` so the Prometheus exporter can add the unit suffix without duplicating it.
- The response-size calculation used `bodyStr.length`, which counts UTF-16 code units rather than bytes. Updated it to `Buffer.byteLength(bodyStr, 'utf8')`.
- The PromQL error-rate query used the old translated label name `http_status_code`. Updated it to `http_response_status_code`.
- The PromQL average response-size query used `avg(api_usage_response_size_bytes)`, which is not the correct way to average classic Prometheus histogram observations. Updated it to divide the rate of the histogram `_sum` series by the rate of the `_count` series.
- The endpoint breadth metric was described as tracking unique endpoints, but the counter records accesses rather than distinct endpoint cardinality. Updated the wording to "Endpoint accesses per consumer."
- The anomaly detection example stored hour timestamps in an array and treated the array length as an average request rate. Updated it to keep per-hour request counts and calculate an average hourly count.
- The cardinality management snippet referenced an undefined `requestsByTier` counter. Updated it to reuse the previously defined request counter with only tier-level attributes.

## Review Notes
The article is technically valid after the fixes. For production use, the middleware examples still assume surrounding application code such as `apiKeyLookup`, `decodeToken`, Express-style `req`/`res` objects, and registered OpenTelemetry SDK/exporter setup.
