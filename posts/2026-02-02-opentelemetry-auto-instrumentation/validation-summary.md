# Validation Summary: How to Use OpenTelemetry Auto-Instrumentation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry SDK (Node.js, Python, Java)
- `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`, `@opentelemetry/api`
- `opentelemetry-distro`, `opentelemetry-bootstrap`, `opentelemetry-instrument` (Python)
- OpenTelemetry Java Agent (`-javaagent`)
- Express, Django, FastAPI, Spring Boot
- Kubernetes Deployment manifests
- OpenTelemetry Operator (Instrumentation CRD)
- OTLP exporter (HTTP/protobuf on port 4318)
- Sampling (`parentbased_traceidratio`)

## Sources Consulted
- OpenTelemetry Zero-Code Python configuration: https://opentelemetry.io/docs/zero-code/python/configuration/
- OpenTelemetry Zero-Code Python logs example: https://opentelemetry.io/docs/zero-code/python/logs-example/
- OpenTelemetry JavaScript Semantic Conventions package (npm): https://www.npmjs.com/package/@opentelemetry/semantic-conventions
- OpenTelemetry JS Semantic Conventions README: https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md
- OpenTelemetry Operator: https://github.com/open-telemetry/opentelemetry-operator
- OpenTelemetry Java Instrumentation: https://github.com/open-telemetry/opentelemetry-java-instrumentation
- OpenTelemetry Python Contrib (LoggingInstrumentor): https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html

## Issues Found

1. **Deprecated `SemanticResourceAttributes` and `new Resource(...)` in the Node.js basic configuration.**
   The `SemanticResourceAttributes` namespace was deprecated in `@opentelemetry/semantic-conventions` (since 1.x) in favor of the per-attribute `ATTR_*` constants, and `new Resource(...)` is no longer supported in `@opentelemetry/resources` 2.0+ — `resourceFromAttributes(...)` should be used instead. Updated the imports and resource construction to the current API (`resourceFromAttributes` + `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION`) and used the literal `deployment.environment.name` key (the stable replacement for the deprecated `deployment.environment`).

2. **Incorrect `SpanStatusCode` access in the "Combining Auto and Manual Instrumentation" example.**
   The code used `trace.SpanStatusCode.ERROR`, but `SpanStatusCode` is a top-level export of `@opentelemetry/api`, not a property of the `trace` namespace — so the original code would have evaluated to `undefined`. Updated the `require` to destructure `SpanStatusCode` and changed the call to `SpanStatusCode.ERROR`.

3. **Duplicate `OTEL_RESOURCE_ATTRIBUTES` env var in the Kubernetes Deployment manifest.**
   The original manifest declared `OTEL_RESOURCE_ATTRIBUTES` twice, which Kubernetes rejects/overrides — only the second value would have been used, dropping `service.version` and `deployment.environment`. Combined both sets of attributes into a single `OTEL_RESOURCE_ATTRIBUTES` entry that includes service metadata together with the pod/namespace fields.

## Review Notes

- The Python CLI examples use the documented underscore-style flags (`--service_name`, `--exporter_otlp_endpoint`), which matches the official OpenTelemetry zero-code Python configuration docs.
- `OTEL_PYTHON_LOG_LEVEL` is documented but its actual effect on SDK debug output is limited; readers who need verbose troubleshooting may also need to configure Python's `logging` module directly.
- `OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true` is valid and used correctly in the Python Dockerfile.
- The Instrumentation CRD intentionally remains at `opentelemetry.io/v1alpha1` even though the `OpenTelemetryCollector` CRD has graduated to `v1beta1`.
- The Java agent download URL (`.../releases/latest/download/opentelemetry-javaagent.jar`) is the canonical "latest" link maintained by the OpenTelemetry Java Instrumentation project.
- The `JAVA_TOOL_OPTIONS` approach in the Java Dockerfile is a well-known and supported way to attach the agent without modifying the `CMD`.
- Worth a future revisit: the post mixes the deprecated `deployment.environment` and the new `deployment.environment.name` semconv attribute names in different sections; standardizing on the new name throughout would be cleaner once readers are on recent semantic-conventions releases.
