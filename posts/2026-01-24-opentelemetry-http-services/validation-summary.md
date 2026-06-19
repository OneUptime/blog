# Validation Summary: How to Configure OpenTelemetry for HTTP Services

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry JavaScript SDK and Node.js auto-instrumentation
- Express
- OpenTelemetry Python SDK
- FastAPI
- HTTPX instrumentation
- OpenTelemetry Go SDK
- Go net/http and otelhttp
- OpenTelemetry Collector
- OTLP over HTTP
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry JavaScript Node SDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript resources documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript 2.x upgrade notes: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python FastAPI instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- FastAPI lifespan events documentation: https://fastapi.tiangolo.com/advanced/events/
- OpenTelemetry Go OTLP trace HTTP exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
- OpenTelemetry Go otelhttp documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector logging exporter deprecation notice: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The Node.js example used `new Resource(...)`, but current OpenTelemetry JS 2.x no longer exports the `Resource` class. Changed it to `resourceFromAttributes(...)`.
- The Node.js resource example used the older deployment environment semantic convention. Updated it to `ATTR_DEPLOYMENT_ENVIRONMENT_NAME`.
- The Node.js OTLP exporter examples reused `OTEL_EXPORTER_OTLP_ENDPOINT` directly as a signal endpoint. Updated the example to prefer signal-specific endpoint variables and append `/v1/traces` or `/v1/metrics` when using the generic base endpoint.
- The Node.js install command omitted packages imported directly by the examples. Added `@opentelemetry/api` and `@opentelemetry/sdk-metrics`.
- The ts-node run command started `instrumentation.ts` in a separate process, so it would not instrument `app.ts`. Changed it to preload instrumentation in the same Node.js process.
- The Python install command omitted runtime packages used by the example. Added `fastapi`, `uvicorn`, and `httpx`.
- The Python resource example used the older deployment environment semantic convention. Updated it to `deployment.environment.name`.
- The Python OTLP exporter example reused `OTEL_EXPORTER_OTLP_ENDPOINT` directly as a trace endpoint. Updated it to prefer `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and append `/v1/traces` when using a generic base endpoint.
- The FastAPI example used deprecated `@app.on_event("shutdown")`. Replaced it with a `lifespan` context manager.
- The Go resource example used an older semantic convention package and `deployment.environment`. Updated it to semconv `v1.37.0` and `semconv.DeploymentEnvironmentName(...)`.
- The Go OTLP HTTP exporter example used `WithEndpoint` for values that may be full OTLP endpoint URLs. Updated it to use `WithEndpointURL` for URL values, append the trace path for generic OTLP base endpoints, and use `WithInsecure()` for the local default collector endpoint.
- The Collector filter processor snippet used an older span exclusion configuration. Updated it to the current `trace_conditions` OTTL format.
- The Collector snippet used the removed/deprecated `logging` exporter. Replaced it with the `debug` exporter.
- A TypeScript catch block accessed `error.message` with an untyped `catch` variable. Updated it to `catch (error: any)` for consistency with the rest of the post.

## Review Notes
The post is technically relevant and code-focused. The examples are intended as illustrative snippets, not complete production applications; future improvements could add sampling guidance per environment and include metrics setup for the Python and Go examples if the post wants full traces-plus-metrics parity across languages.
