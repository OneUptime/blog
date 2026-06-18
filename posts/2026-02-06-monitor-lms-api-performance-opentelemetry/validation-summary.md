# Validation Summary: How to Monitor Learning Management System API Performance with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Python API
- OTLP/gRPC exporters
- Node.js auto-instrumentation
- OpenTelemetry metrics and traces
- Canvas LMS REST API
- Moodle web services
- Blackboard Learn REST API quotas

## Sources Consulted
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript Meter API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Meter.html
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Python span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- Canvas Submissions API documentation: https://canvas.instructure.com/doc/api/submissions.html
- Canvas API throttling documentation: https://canvas.instructure.com/doc/api/file.throttling.html
- Moodle External Services developer documentation: https://docs.moodle.org/dev/Web_services
- Moodle web service client documentation: https://docs.moodle.org/501/en/Development%3ACreating_a_web_service_client
- Blackboard Learn groups, site quotas, and rate limits documentation: https://blackboard.github.io/assets/pdfs/rest-apis/learn/admin/groups-quotas-rates.pdf
- npm package metadata for deprecated `@opentelemetry/exporter-otlp-grpc` and current OTLP exporter packages.

## Issues Found
- The Node.js install command and trace exporter import used deprecated `@opentelemetry/exporter-otlp-grpc`. Updated the post to use `@opentelemetry/exporter-trace-otlp-grpc` and `@opentelemetry/exporter-metrics-otlp-grpc`.
- The Node.js setup used `new Resource()` and `SemanticResourceAttributes`, which do not match the current OpenTelemetry JavaScript documentation. Updated it to `resourceFromAttributes()` with `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`.
- The OTLP/gRPC exporter URL used `grpc://...`; current OTLP exporter configuration uses `http://` or `https://` endpoint URLs, including for gRPC. Updated the endpoint to `http://your-otel-collector:4317`.
- The initial SDK setup configured only a trace exporter while the post later records metrics. Added `PeriodicExportingMetricReader` with an OTLP metric exporter so custom metrics can be exported.
- The custom metric example created an observable gauge but never registered a callback or used the `remaining` parameter. Added a small `Map` and `addCallback()` implementation to observe the latest rate-limit values.
- The code used the older `http.status_code` semantic attribute. Updated JavaScript and Python snippets to use current `http.response.status_code`.
- The rate-limit description overstated Moodle and Blackboard behavior. Reworded it to match documented Canvas throttling, Moodle web service function/service configuration, and Blackboard site quota/daily request-limit documentation.
- The Moodle Python snippet referenced `MOODLE_URL` and `MOODLE_TOKEN` without defining them. Added environment variable reads so the example is executable.

## Review Notes
The corrected Node.js snippets were checked by installing the current OpenTelemetry packages in a temporary directory and constructing the SDK, histogram, and observable gauge. The Python snippet was syntax-compiled with Python 3.12. The post remains a general monitoring guide; production examples should also consider request timeouts, pagination, and avoiding high-cardinality LMS identifiers in metrics.
