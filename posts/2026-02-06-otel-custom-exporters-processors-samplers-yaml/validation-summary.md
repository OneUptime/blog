# Validation Summary: How to Define Custom Exporters, Processors, and Samplers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry declarative configuration
- OpenTelemetry SDK exporters, span processors, log processors, metric readers, views, and samplers
- YAML configuration
- OTLP gRPC exporter
- OpenTelemetry SDK extension plugins / PluginComponentProvider

## Sources Consulted
- OpenTelemetry Configuration specification: https://opentelemetry.io/docs/specs/otel/configuration/
- OpenTelemetry Configuration SDK specification, including PluginComponentProvider behavior: https://opentelemetry.io/docs/specs/otel/configuration/sdk/
- OpenTelemetry declarative configuration language guide: https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/
- OpenTelemetry declarative configuration schema documentation: https://github.com/open-telemetry/opentelemetry-configuration/blob/main/schema-docs.md
- OpenTelemetry Trace SDK specification for SpanProcessor callback behavior: https://opentelemetry.io/docs/specs/otel/trace/sdk/

## Issues Found
- The post used `file_format: "0.3"`, which is outdated for the current declarative configuration schema. Updated examples to `file_format: "1.0"`.
- The OTLP exporter examples used a generic `otlp` key with `protocol: "grpc"`. The current declarative schema uses distinct exporter keys such as `otlp_grpc` and `otlp_http`. Updated gRPC examples to `otlp_grpc` and removed the invalid `protocol` fields.
- The post presented Zipkin as a built-in declarative SDK exporter. The current schema does not define a built-in `zipkin` exporter key; unknown exporter names are custom SDK extension plugins. Updated the text to say this requires a registered `PluginComponentProvider` for a `zipkin` span exporter.
- The processor examples used Collector-style `filter` and `attributes` processors as if they were built-in SDK declarative processors. Updated the examples and text to describe them as custom span processor plugins that must be registered with the SDK.
- The post described processors as a filtering/enrichment pipeline. SDK span processors run callbacks in registration order, but they are not Collector pipeline processors. Updated the explanation to avoid implying built-in Collector-style pipeline semantics.
- The Jaeger remote sampler example used `jaeger_remote` and `polling_interval`. The current schema defines this as the experimental `jaeger_remote/development` sampler and uses `interval`. Updated the example and text.
- The final example used map-shaped resource attributes. The current schema expects `resource.attributes` as a list of name/value entries. Updated the resource example accordingly.
- The final example used `deployment.environment`, while current OpenTelemetry semantic conventions use `deployment.environment.name`. Updated the attribute name.
- The final example used inline propagator names. The current schema represents `propagator.composite` as a list of propagator objects. Updated it to `- tracecontext:` and `- baggage:`.

## Review Notes
- OpenTelemetry's declarative configuration schema is stable, but implementation support varies by language; the official language guide currently calls out Java support and notes that implementation support is still experimental in places.
- Custom exporter, processor, and sampler names in declarative YAML only work when the corresponding SDK plugin provider is available and registered.
- YAML snippets were parsed after editing to verify YAML syntax.
