# Validation Summary: How to Avoid the Anti-Pattern of Hardcoding Exporter Endpoints Instead of

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry JavaScript SDK
- OpenTelemetry Python SDK
- Docker Compose
- Kubernetes Deployments
- Environment variable configuration

## Sources Consulted
- OpenTelemetry Environment Variable Specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry OTLP Exporter Configuration docs: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry JavaScript exporters docs: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript NodeSDK README: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-sdk-node/README.md
- OpenTelemetry JavaScript OTLP trace HTTP exporter API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-http.html
- OpenTelemetry Python OTLP exporter API docs: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Python environment variable docs: https://opentelemetry-python.readthedocs.io/en/latest/sdk/environment_variables.html
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes dependent environment variable docs: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/

## Issues Found
- The JavaScript examples imported `@opentelemetry/exporter-trace-otlp-http` while the post configured `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`. The OpenTelemetry JavaScript docs use `@opentelemetry/exporter-trace-otlp-proto` for HTTP/protobuf, so the examples were updated to import `@opentelemetry/exporter-trace-otlp-proto`.
- The post said all compliant SDKs respect the standard environment variables and that every compliant SDK supports the approach. The OpenTelemetry specification defines these variables but says implementations may choose to support them, and the docs note that language support varies. The wording was narrowed to SDKs/exporters that support the variables, including the JavaScript and Python examples shown.
- The Kubernetes Deployment snippet was missing required `metadata`, `spec.selector`, matching pod template labels, and a container image. It was updated to be a valid `apps/v1` Deployment snippet.
- The Kubernetes snippet referenced `$(APP_VERSION)` without defining `APP_VERSION`. Kubernetes supports dependent environment variable expansion, so `APP_VERSION` was added before `OTEL_RESOURCE_ATTRIBUTES`.

## Review Notes
- The Docker Compose example pins `otel/opentelemetry-collector-contrib:0.96.0`, which is valid but old as of this review date. Consider updating the version during a broader content refresh.
