# Validation Summary: How to Choose Between OpenTelemetry and Proprietary Instrumentation

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry semantic conventions
- Datadog ddtrace Python library
- Datadog Java APM agent
- Prometheus remote write
- Grafana Loki
- Jaeger
- Grafana Tempo

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector probabilistic sampler processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Prometheus remote write exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/enterprise-logs/latest/send-data/otel/
- Datadog server-side custom instrumentation documentation: https://docs.datadoghq.com/tracing/trace_collection/custom_instrumentation/server-side/
- Datadog ddtrace API documentation: https://datadoghq.dev/dd-trace-api-py/pdocs/ddtrace_api.html
- Datadog Java tracing setup documentation: https://docs.datadoghq.com/tracing/trace_collection/automatic_instrumentation/dd_libraries/java/
- OpenTelemetry semantic conventions documentation: https://opentelemetry.io/docs/concepts/semantic-conventions/

## Issues Found
- The Datadog Python example attempted to call `tracer.set_tag(...)`. Datadog documents local tags as span-level operations, so the example now gets the current span with `tracer.current_span()` and calls `span.set_tag(...)`.
- The OpenTelemetry Collector multi-vendor example used the deprecated `prometheusremotewrite` exporter identifier. Updated it to the current `prometheus_remote_write` identifier.
- The Loki exporter example used `loki` with `/loki/api/v1/push`. Grafana's current OpenTelemetry ingestion guidance uses the Collector `otlphttp` exporter pointed at Loki's OTLP endpoint, so the example now uses `otlphttp/loki` with `/otlp`.
- The filter processor example used legacy include/exclude-style configuration. Updated it to the current OTTL-based `metric_conditions` and `log_conditions` syntax.
- The self-hosting section said proprietary instrumentation requires a vendor SaaS platform. That was too broad, so it now says vendor backend or agent pipeline.

## Review Notes
The remaining code and configuration examples are illustrative and omit full runtime setup such as OpenTelemetry SDK exporter initialization, Collector service pipelines for the processor-only snippet, authentication headers for some backends, and production TLS details. Those omissions are acceptable for a comparison guide, but a future hands-on tutorial should include complete runnable configurations.
