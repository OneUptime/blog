# Validation Summary: How to Understand OpenTelemetry Vendor-Neutral Instrumentation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry API and SDK
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- OpenTelemetry semantic conventions
- Python OpenTelemetry instrumentation
- JavaScript OpenTelemetry API usage
- W3C Trace Context propagation
- Prometheus remote write
- Jaeger, Prometheus, and Loki OTLP ingestion

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry semantic conventions overview: https://opentelemetry.io/docs/concepts/semantic-conventions/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector telemetry transformation documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- Prometheus OpenTelemetry backend guide: https://prometheus.io/docs/guides/opentelemetry/
- Jaeger API documentation for OTLP support: https://www.jaegertracing.io/docs/1.55/apis/
- Grafana Loki OTLP API documentation: https://grafana.com/docs/loki/latest/api/
- OpenTelemetry status documentation for signals and profiles: https://opentelemetry.io/docs/specs/status/
- OpenTelemetry Profiles public alpha announcement: https://opentelemetry.io/blog/2026/profiles-alpha/

## Issues Found
- The HTTP semantic convention examples used older attribute names such as `http.method`, `http.status_code`, and `http.target`. Updated the prose and Python example to current names such as `http.request.method`, `http.response.status_code`, `url.full`, and `http.response.body.size`.
- The HTTP semantic convention Python example called `requests.request()` without importing `requests`. Added the missing import.
- The Collector metrics pipeline used the `prometheus` exporter with `endpoint: "prometheus:9090"`, which describes a scrape endpoint exporter rather than pushing metrics to a Prometheus backend. Updated it to `prometheus_remote_write` with the Prometheus remote write path.
- The cost-routing filter processor example used older include-style filtering and would not route high-cardinality spans as described. Updated it to OTTL filter conditions that drop spans not intended for each pipeline.
- The cost-routing Collector example referenced `batch` without defining it. Added the missing `batch` processor.
- The W3C propagation section said cross-vendor tracing was impossible before Trace Context. Reworded it to say it was difficult and often required translation, which is more technically accurate.
- The future-signals section implied session replay is being standardized as an OpenTelemetry signal. Reworded it to focus on OpenTelemetry Profiles and evolving client-side/RUM instrumentation patterns.

## Review Notes
The examples are illustrative and omit full SDK/provider/exporter initialization, which is reasonable for a vendor-neutral instrumentation guide. Prometheus remote write requires the receiving Prometheus-compatible backend to have remote write ingestion enabled.
