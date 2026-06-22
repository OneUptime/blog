# Validation Summary: How to Handle Distributed Tracing Setup

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Distributed tracing
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Jaeger
- OneUptime
- Python OpenTelemetry SDK and instrumentation for Flask, FastAPI, requests, HTTPX, SQLAlchemy, and B3 propagation
- Node.js OpenTelemetry SDK and auto-instrumentation
- Express
- Go OpenTelemetry SDK and otelhttp instrumentation
- Tail-based and probabilistic sampling
- OpenTelemetry semantic conventions

## Sources Consulted
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector transforming telemetry and filter processor documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector Jaeger exporter migration guidance: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry Collector logging exporter removal notice: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry Go instrumentation documentation: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry semantic conventions documentation: https://opentelemetry.io/docs/specs/semconv/
- OpenTelemetry Python semantic conventions package/source documentation: https://github.com/open-telemetry/opentelemetry-python/tree/main/opentelemetry-semantic-conventions
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry
- OTLP specification: https://opentelemetry.io/docs/specs/otlp/

## Issues Found
- The Collector configuration used the removed native `jaeger` exporter with `jaeger:14250`. Updated it to export to Jaeger over OTLP using `otlp/jaeger` and `jaeger:4317`, which matches current Jaeger and Collector guidance.
- The Docker Compose snippet exposed Jaeger's old gRPC collector port and a Prometheus exporter port that the Collector configuration did not use. Removed those port mappings to avoid implying unsupported or unused behavior.
- The Collector configuration used the removed/deprecated `logging` exporter. Replaced it with the current `debug` exporter and `verbosity: detailed`.
- The Collector filter processor example used older include/exclude syntax. Updated it to OTTL conditions under `traces.span`, matching current filter processor documentation.
- The `probabilistic_sampler` processor was configured but omitted from the trace pipeline. Added it to the trace pipeline before batching so the sample configuration actually applies.
- The OneUptime exporter used the gRPC `otlp` exporter with an HTTPS path endpoint. Changed it to `otlphttp/oneuptime`, matching OneUptime's documented `https://oneuptime.com/otlp` endpoint.
- The Python installation command omitted packages required by the shown examples: B3 propagation, FastAPI instrumentation, and HTTPX instrumentation. Added `opentelemetry-propagator-b3`, `opentelemetry-instrumentation-fastapi`, and `opentelemetry-instrumentation-httpx`.
- The Node.js setup used `new Resource()` and `SemanticResourceAttributes`, which are outdated for OpenTelemetry JS 2.x examples. Updated it to `resourceFromAttributes()` and `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION`.
- The sampling configuration referenced the old `jaeger` exporter. Updated it to `otlp/jaeger` to stay consistent with the corrected Collector configuration.
- The Python semantic conventions example used the deprecated `SpanAttributes` class and older HTTP/database attribute names. Replaced it with current generated semantic-convention constants from `http_attributes`, `url_attributes`, and `db_attributes`.

## Review Notes
- The examples are intentionally illustrative and use `latest` container images. For production documentation, pinning Collector, Jaeger, and language package versions would make the snippets more reproducible.
- The Go snippet still uses a versioned semantic-conventions import. That is valid, but projects should align the semconv version with their OpenTelemetry Go dependency set to avoid schema-version conflicts.
