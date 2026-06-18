# Validation Summary: How to Implement Auto-Instrumentation in OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry auto-instrumentation
- OpenTelemetry JavaScript / Node.js SDK
- OpenTelemetry Python SDK and zero-code instrumentation
- OpenTelemetry Java agent
- OTLP exporters and Collector endpoints
- Express, Flask, PostgreSQL, Redis, JDBC, Servlet, Spring Web

## Sources Consulted
- OpenTelemetry JavaScript zero-code instrumentation: https://opentelemetry.io/docs/zero-code/js/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK 2.x upgrade notes: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry Python getting started and auto-instrumentation: https://opentelemetry.io/docs/languages/python/getting-started/
- OpenTelemetry Python zero-code auto-instrumentation example: https://opentelemetry.io/docs/zero-code/python/example/
- OpenTelemetry Python Flask instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Python OTLP exporter docs: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry OTLP protocol specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Java agent getting started: https://opentelemetry.io/docs/zero-code/java/agent/getting-started/
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java agent suppressing instrumentation: https://opentelemetry.io/docs/zero-code/java/agent/disable/

## Issues Found
- The Node.js setup used the older `new Resource(...)` pattern and `SemanticResourceAttributes` constants. Updated it to use `resourceFromAttributes(...)` and current `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION` constants, matching current OpenTelemetry JS documentation.
- The Node.js OTLP HTTP exporter example appended `/v1/traces` and `/v1/metrics` to an environment variable that could be unset and did not show the OTLP/HTTP default port. Added a default base endpoint of `http://localhost:4318`.
- The Node.js request hooks could set attributes with missing values when the request ID header or Express route was absent. Added guards before setting those attributes.
- The Python zero-code example used `http://collector:4317` without explicitly selecting OTLP/gRPC. Added `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` because port 4317 is the OTLP/gRPC default.
- The Python programmatic gRPC exporter examples used local collector endpoints without explicitly setting `insecure=True`. Added `http://localhost:4317` defaults and `insecure=True`, consistent with OpenTelemetry Python OTLP gRPC examples.
- The Java examples used `http://collector:4317` with the latest Java agent. Current Java agent 2.x defaults to OTLP HTTP/protobuf, so updated those endpoints to `http://collector:4318`.
- The Java environment-variable snippet was labeled as disabling specific instrumentations while setting each instrumentation to `true`. Updated it to the documented "enable only specific instrumentation" pattern by adding `OTEL_INSTRUMENTATION_COMMON_DEFAULT_ENABLED=false`.

## Review Notes
- The post is technically relevant and contains implementation code, commands, and configuration snippets.
- OpenTelemetry APIs and semantic conventions continue to evolve; future reviews should re-check JS semantic convention constant names and Java agent default exporter behavior against the then-current release.
