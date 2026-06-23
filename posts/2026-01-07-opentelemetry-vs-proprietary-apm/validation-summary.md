# Validation Summary: How to Evaluate OpenTelemetry vs Proprietary APM Solutions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry APIs, SDKs, Collector, OTLP, traces, metrics, logs, and profiles
- OpenTelemetry Python and JavaScript/TypeScript instrumentation
- OpenTelemetry Collector processors and exporters
- Jaeger, Prometheus, Grafana Tempo, Grafana Loki, and Grafana Cloud
- Datadog Python APM instrumentation
- New Relic, Dynatrace, and Splunk APM
- W3C Trace Context
- APM cost modeling and migration planning

## Sources Consulted
- OpenTelemetry official documentation: https://opentelemetry.io/docs/
- OpenTelemetry specification status: https://opentelemetry.io/docs/specs/status/
- OpenTelemetry Profiles documentation: https://opentelemetry.io/docs/concepts/signals/profiles/
- OpenTelemetry CNCF project page: https://www.cncf.io/projects/opentelemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector telemetry transformation and filter processor documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector Jaeger exporter migration note: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Datadog Python tracing documentation: https://docs.datadoghq.com/tracing/trace_collection/dd_libraries/python/
- ddtrace Python API documentation: https://ddtrace.readthedocs.io/en/stable/api.html
- Datadog profiler documentation: https://docs.datadoghq.com/profiler/enabling/
- Dynatrace trace context documentation: https://docs.dynatrace.com/docs/observe/application-observability/distributed-tracing/tracking-transactions
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- OpenTelemetry JavaScript metrics documentation: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/metrics.md

## Issues Found
- OpenTelemetry was described as a CNCF incubating project. Updated it to "graduated" because CNCF records OpenTelemetry as graduated as of May 2026.
- The comparison table listed Dynatrace propagation as only proprietary. Updated it to "Proprietary + W3C" because Dynatrace supports W3C Trace Context.
- The table described OpenTelemetry log collection as simply stable. Changed this to note that stability varies by language and component, matching OpenTelemetry's signal and component status model.
- The table described OpenTelemetry profiling as "in development." Updated it to "Alpha" to match the current OpenTelemetry Profiles status.
- The Python OTLP exporter comment said the endpoint could point directly to Jaeger, Zipkin, or any vendor. Narrowed this to an OpenTelemetry Collector or compatible OTLP endpoint because native Jaeger exporters have been removed/deprecated and OTLP compatibility is the relevant requirement.
- The Datadog Python example used invalid current `tracer.configure()` arguments for agent host, port, profiling, and application security. Replaced that block with documented Datadog environment-variable configuration guidance while preserving the conceptual vendor-specific example.
- The Collector multi-backend example used the removed native `jaeger` exporter. Replaced it with an OTLP exporter targeting a Jaeger OTLP endpoint.
- The Collector examples used the deprecated `otlphttp` component name. Updated examples to `otlp_http`.
- The cost worksheet undercounted trace and metric storage by orders of magnitude. Corrected the storage calculations for the stated assumptions of roughly 1 KB per span and 100 bytes per metric point.
- The JavaScript metrics example referenced an undefined `opentelemetry` object. Added the documented `metrics` import from `@opentelemetry/api`.
- The TypeScript abstraction example included an unused and misleading `SpanContext` parent option. Removed it, and fixed strict TypeScript error handling so `catch (error)` is narrowed before accessing message and stack fields.
- The hybrid Collector example used the deprecated Loki exporter. Replaced it with `otlp_http/loki` targeting Loki's native OTLP endpoint.
- The hybrid Collector example used the removed/deprecated `logging` exporter name. Replaced it with the current `debug` exporter.
- The hybrid Collector example described the filter processor as selecting critical spans, but the OpenTelemetry filter processor drops telemetry matching its conditions. Rewrote the filter as `filter/drop_non_critical` so it drops non-critical spans and forwards errors, HTTP 5xx spans, and high-latency spans.
- The hybrid trace pipeline said all traces go to Tempo for complete retention while also applying tail sampling. Removed tail sampling from the full-retention Tempo pipeline and kept sampling only in the commercial-backend pipeline.

## Review Notes
Some pricing figures and vendor feature comparisons are necessarily approximate and can change by contract, region, and product tier. The post now avoids concrete technical inaccuracies, but the pricing defaults should still be treated as a worksheet starting point rather than current vendor pricing.
