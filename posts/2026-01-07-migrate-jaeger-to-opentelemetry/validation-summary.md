# Validation Summary: How to Migrate from Jaeger to OpenTelemetry

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry
- Jaeger
- OpenTelemetry Collector
- OTLP
- OpenTracing
- Go
- Python
- JavaScript/Node.js
- Distributed tracing and propagation

## Sources Consulted
- Jaeger SDK migration guide: https://www.jaegertracing.io/sdk-migration/
- Jaeger APIs and OTLP support documentation: https://www.jaegertracing.io/docs/1.76/architecture/apis/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Jaeger receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/jaegerreceiver/README.md
- OpenTelemetry Collector Jaeger exporter migration note: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry Collector logging-to-debug exporter announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry Go OTLP gRPC exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go Jaeger propagator package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/propagators/jaeger
- OpenTelemetry Go semantic conventions package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry Go tracetest package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace/tracetest
- OpenTelemetry Python resource documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/resources.html
- OpenTelemetry Python composite propagator documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/propagators.composite.html
- OpenTelemetry JavaScript Node.js getting started documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/

## Issues Found
- The Collector configuration used the removed native `jaeger` exporter. I replaced it with an `otlp/jaeger` exporter targeting Jaeger's OTLP gRPC port, because current Collector distributions no longer include the native Jaeger exporter and Jaeger accepts OTLP directly.
- The Collector configuration used the removed/deprecated `logging` exporter and `loglevel` option. I replaced it with the `debug` exporter and `verbosity: detailed`.
- The Go OpenTelemetry setup used the older `deployment.environment` attribute and imported `attribute` only for that. I changed it to the stable `semconv.DeploymentEnvironmentName("production")` semantic convention and removed the now-unused import.
- The Go span example said `RecordError` automatically sets the span status. I corrected the comment to state that `RecordError` records an exception event and `SetStatus` marks the span as failed.
- The Go HTTP middleware snippet imported `go.opentelemetry.io/otel/propagation` but did not use it. I removed the unused import.
- The Go semantic convention example used older/deprecated helpers such as `HTTPMethod`, `HTTPURL`, `DBStatement`, and `DBSystemPostgreSQL`. I updated the example to current semantic convention names in `semconv/v1.37.0`.
- The data-model table mapped all Jaeger references to OpenTelemetry links. I clarified that parent-child references map to parent context, while non-parent references map to links.
- The Python resource example used `Resource(...)` directly. I changed it to `Resource.create(...)`, matching the current Python SDK documentation.
- The Python and Collector examples used the older `deployment.environment` attribute. I updated them to `deployment.environment.name`.
- The Node.js install commands omitted packages that the sample directly imports: `@opentelemetry/auto-instrumentations-node` and `@opentelemetry/core`. I added both commands.
- The Node.js setup used `new Resource(...)` and `SemanticResourceAttributes`, which are not current OpenTelemetry JS 2.x APIs. I changed the example to `resourceFromAttributes` and current semantic convention constants.
- The Node.js manual span example read `span.startTime`, which is not part of the public OpenTelemetry API span interface. I changed the example to capture `Date.now()` before starting the span and compute elapsed time from that local timestamp.
- The Go trace propagation test deferred ending the client span until after reading the in-memory exporter, so the client span might not be exported when checked. I ended the client span before inspection.
- The Go trace propagation test treated `SpanStub.SpanContext` as a method and assumed span export order. I changed it to use the `SpanContext` field and find spans by name before comparing trace IDs.

## Review Notes
- The Go snippets could not be compiled locally because the review environment does not have the Go toolchain installed. API names and behavior were checked against official `pkg.go.dev` documentation instead.
- The post still presents illustrative snippets with placeholder application functions such as `doWork`, `processPayment`, and `updateInventory`; these are acceptable for a migration guide but are not standalone programs.
- The Node.js sample is written as CommonJS and uses `node --require`, which is still appropriate for CommonJS preload files. The current OpenTelemetry JavaScript docs increasingly show `--import` for ESM examples.
