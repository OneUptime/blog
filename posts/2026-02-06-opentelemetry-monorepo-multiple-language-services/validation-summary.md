# Validation Summary: How to Add OpenTelemetry to a Monorepo with Multiple Language Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry SDK configuration and semantic conventions
- OpenTelemetry Go SDK
- OpenTelemetry JavaScript / Node.js SDK
- OpenTelemetry Python SDK
- OTLP HTTP/protobuf exporters
- Kubernetes ConfigMaps and Deployment environment variables
- Monorepo dependency management
- Bash CI validation scripts

## Sources Consulted
- OpenTelemetry Environment Variable Specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry General SDK Configuration: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry Go Resources documentation: https://opentelemetry.io/docs/languages/go/resources/
- OpenTelemetry Go Sampling documentation: https://opentelemetry.io/docs/languages/go/sampling/
- OpenTelemetry Go semconv package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry JavaScript Exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript overview and support status: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry Python Exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python Resource and environment variable documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/environment_variables.html
- OpenTelemetry Deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- npm package registry checks for `@opentelemetry/*` package versions
- PyPI package index checks for `opentelemetry-*` package versions

## Issues Found
- The post used deprecated `deployment.environment` resource attributes. Changed examples to the current `deployment.environment.name` semantic convention.
- The generated environment script and Kubernetes ConfigMap omitted `OTEL_LOG_LEVEL` even though the shared YAML included a log level. Added `OTEL_LOG_LEVEL="info"` to keep the examples consistent with OpenTelemetry SDK environment variables.
- The post claimed all OpenTelemetry SDKs respect the same environment variables. Narrowed this to the official SDKs and variables used in the article, because environment-variable support is implementation-specific.
- The Go initialization example did not apply `OTEL_TRACES_SAMPLER` / `OTEL_TRACES_SAMPLER_ARG` and only configured Trace Context propagation. Added sampler handling for the shown sampler values and configured both Trace Context and Baggage propagation.
- The Go snippet used an older semantic-conventions import and helper functions. Updated it to `go.opentelemetry.io/otel/semconv/v1.37.0` with `ServiceNameKey.String` and `ServiceVersionKey.String`.
- The Node.js example configured `http/protobuf` but imported the OTLP HTTP/JSON exporter packages. Changed imports to `@opentelemetry/exporter-trace-otlp-proto` and `@opentelemetry/exporter-metrics-otlp-proto`.
- The dependency pin examples were outdated. Updated Node.js pins, including the directly imported SDK metrics package, to current npm versions checked on 2026-06-05 and Python constraints to current PyPI versions checked on 2026-06-05.

## Review Notes
The CI script is intentionally heuristic: checking dependency manifests catches missing baseline packages, but it does not prove that instrumentation is initialized at runtime. It is acceptable as a lightweight CI guard for this guide.
