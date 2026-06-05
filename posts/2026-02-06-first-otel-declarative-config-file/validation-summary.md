# Validation Summary: How to Write Your First OpenTelemetry Declarative Config File with Trace,

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry SDK declarative configuration
- OpenTelemetry trace, metric, and log providers
- OTLP gRPC exporters
- OpenTelemetry resource attributes and semantic conventions
- OpenTelemetry context propagation

## Sources Consulted
- OpenTelemetry Declarative Configuration: https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/
- OpenTelemetry Configuration Types Reference / generated schema docs: https://github.com/open-telemetry/opentelemetry-configuration/blob/main/schema-docs.md
- OpenTelemetry SDK Environment Variable Specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Resources documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Deployment semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/

## Issues Found
- The examples used `file_format: "0.3"`, which is outdated for the stable declarative configuration examples. Updated the snippets to `file_format: "1.0"`.
- The resource examples used map-style `resource.attributes`. The current schema defines `resource.attributes` as a list of `name` / `value` entries. Updated all resource snippets.
- The examples used deprecated `deployment.environment`. Updated it to the current semantic convention attribute `deployment.environment.name`.
- OTLP gRPC exporters were written as `otlp` with `protocol: "grpc"`. The declarative configuration schema uses the exporter plugin key `otlp_grpc`, so all exporter snippets were updated.
- The propagator example used shorthand scalar list values. The schema expects `TextMapPropagator` objects under `composite`, so the examples now use `- tracecontext:` and `- baggage:`.
- The run command used deprecated `OTEL_EXPERIMENTAL_CONFIG_FILE`. Updated it to `OTEL_CONFIG_FILE`.
- The initial structure example showed empty provider objects, but provider sections require child fields when enabled. Updated the wording and snippet to avoid presenting invalid empty providers as a working config.

## Review Notes
OpenTelemetry declarative configuration support is still implementation-dependent even though the schema is stable. The post's Java command is plausible for an application using an SDK or agent version that supports `OTEL_CONFIG_FILE`, but readers should still confirm their language SDK or Java agent version supports declarative configuration.
