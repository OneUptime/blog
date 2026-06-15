# Validation Summary: How to Implement SDK Configuration in OpenTelemetry

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry SDK configuration
- OpenTelemetry environment variables
- OTLP exporters
- OpenTelemetry JavaScript SDK for Node.js
- OpenTelemetry Python SDK
- Kubernetes ConfigMaps and Deployment environment variables

## Sources Consulted
- OpenTelemetry Environment Variable Specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry OTLP Exporter Specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry General SDK Configuration docs: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry JavaScript NodeSDK README: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-sdk-node/README.md
- OpenTelemetry JavaScript SDK 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python environment variable documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/environment_variables.html
- OpenTelemetry deployment resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/

## Issues Found
- The post stated that environment variables take precedence. I changed this to explain that precedence depends on the SDK and configuration mechanism, and noted that `OTEL_CONFIG_FILE` takes precedence over SDK environment variables when declarative configuration is used.
- The post stated that the listed variables work across all SDKs. I changed this to say they are standardized but support and defaults vary by SDK.
- OTLP examples mixed OTLP/gRPC port `4317` with OTLP/HTTP `/v1/*` paths. I changed the examples to use OTLP/HTTP on port `4318` with `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`.
- The OTLP per-signal endpoint comments did not mention that OTLP/HTTP per-signal endpoints are used as-is. I clarified this.
- The `deployment.environment` resource attribute is deprecated. I changed examples to `deployment.environment.name`.
- The JavaScript example used `new Resource(...)`, which is no longer exported in OpenTelemetry JS SDK 2.x. I changed it to `resourceFromAttributes(...)`.
- The JavaScript example used deprecated semantic-convention namespace constants. I replaced them with stable attribute key strings.
- The JavaScript example used deprecated `logRecordProcessor` NodeSDK configuration. I changed it to `logRecordProcessors`.
- The JavaScript and Python sampler helpers did not support all sampler values listed in the article. I added `always_off`, `parentbased_always_on`, and `parentbased_always_off`.
- The JavaScript sampler helper treated `OTEL_TRACES_SAMPLER_ARG=0` as unset. I changed it to preserve a valid zero sampling ratio.
- The JavaScript and Python OTLP URL construction could produce malformed paths when the base endpoint had a trailing slash. I added small helper functions to normalize the base URL.
- The JavaScript header parser dropped `=` characters inside header values. I changed it to split only on the first `=`.

## Review Notes
The post is now technically valid as an OTLP/HTTP-focused SDK configuration guide. Some SDK defaults still vary by language, especially OTLP timeout units and default protocols, so the summary and table now call out implementation-specific behavior where needed.
