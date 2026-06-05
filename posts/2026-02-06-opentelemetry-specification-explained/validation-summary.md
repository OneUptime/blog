# Validation Summary: How to Understand the Open Telemetry Specification and Why It Exists

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Open Telemetry specification
- Open Telemetry API and SDK
- Open Telemetry Protocol (OTLP)
- Open Telemetry semantic conventions
- W3C Trace Context propagation
- Python, JavaScript, and Go Open Telemetry APIs

## Sources Consulted
- Open Telemetry Environment Variable Specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- Open Telemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Open Telemetry common specification concepts: https://opentelemetry.io/docs/specs/otel/common/
- Open Telemetry versioning and stability guidance: https://opentelemetry.io/docs/specs/otel/versioning-and-stability/
- Open Telemetry HTTP semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- Open Telemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- Open Telemetry Python Zipkin exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/zipkin/zipkin.html
- Open Telemetry JavaScript OTLP gRPC exporter documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-grpc.html
- Go Open Telemetry semantic convention package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.20.0

## Issues Found
- The Python `trace.get_tracer` example used `instrumenting_module_version`, which is not the current parameter name. Changed it to `instrumenting_library_version`.
- The Go SDK example was missing the `context` import and did not handle `err`, which would make the snippet fail to compile. Added the import and error checks.
- The environment variable section claimed every SDK must support environment variables. The specification standardizes environment variable names and behavior, but implementations may choose how to provide environment-based configuration. Updated the wording.
- The JavaScript context propagation example used `trace.SpanKind.SERVER`; the JavaScript API exports `SpanKind` separately. Updated the import and usage.
- Several HTTP and database semantic convention examples used deprecated names such as `http.method`, `http.status_code`, `http.url`, `db.system`, and `db.statement`. Updated them to current names such as `http.request.method`, `http.response.status_code`, `url.full`, `db.system.name`, and `db.query.text`.
- The Node.js OTLP gRPC exporter example used a plain object for gRPC metadata and a string for compression. Updated it to use `grpc.Metadata` and `CompressionAlgorithm.GZIP`, matching the JavaScript exporter documentation.
- The Python backend-switching example used deprecated or incorrect exporter imports for native Jaeger and Zipkin. Replaced the native Jaeger-style example with an OTLP exporter and corrected the Zipkin import to `opentelemetry.exporter.zipkin.json`.
- The second Go example imported `go.opentelemetry.io/otel/trace` without using it. Removed the unused import.

## Review Notes
The article is technically useful after the corrections. Some semantic convention areas are still actively evolving, so future revisions should re-check attribute names against the current Open Telemetry semantic convention registry before publication.
