# Validation Summary: How to Fix the Mistake of Not Setting service.name and Getting 'unknown_service'

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry SDK resource attributes
- OpenTelemetry environment variable configuration
- OpenTelemetry JavaScript SDK
- OpenTelemetry Python SDK
- OpenTelemetry Java SDK
- OpenTelemetry Collector resource processor
- Docker Compose and Kubernetes environment variable snippets

## Sources Consulted
- OpenTelemetry Resources concept documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Environment Variable Specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry General SDK Configuration: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry Resource SDK specification: https://opentelemetry.io/docs/specs/otel/resource/sdk/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/entities/service/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Java semantic conventions Javadoc: https://javadoc.io/doc/io.opentelemetry.semconv/opentelemetry-semconv/latest/index.html

## Issues Found
- The post used the deprecated `deployment.environment` attribute. Updated examples and the resource attribute table to use the current `deployment.environment.name` semantic convention.
- The Node.js example used `new Resource(...)`, which is not the current documented way to create resources in OpenTelemetry JavaScript. Updated it to import `NodeSDK` and use `resourceFromAttributes(...)`.
- The Python example instantiated `TracerProvider` without importing it. Added the missing `from opentelemetry.sdk.trace import TracerProvider` import.
- The Java example used deprecated `ResourceAttributes` constants. Updated it to use `AttributeKey.stringKey(...)` with the current semantic convention names.
- The fallback wording used `process_name`; the OpenTelemetry semantic convention specifies the process executable name. Updated that explanation.
- The post implied every SDK reads `OTEL_SERVICE_NAME`. Updated the wording to account for language-specific environment configuration support.
- The common mistakes section implied SDKs necessarily log `unknown_service` warnings and that service names cannot contain spaces or special characters. Reworded these points to avoid unsupported claims while preserving the practical guidance.

## Review Notes
The Collector debug logging snippet is valid for Collector internal logs. For inspecting payload contents in a live troubleshooting flow, the official Collector docs also recommend the `debug` exporter.
