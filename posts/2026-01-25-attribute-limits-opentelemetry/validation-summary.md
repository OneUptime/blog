# Validation Summary: How to Configure Attribute Limits in OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry SDK span limits
- OpenTelemetry JavaScript / Node.js SDK
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OpenTelemetry Java SDK
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector attributes processor
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector memory limiter and internal telemetry

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry JavaScript SDK Node documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript SDK 2.x migration guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JavaScript SpanLimits interface documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-base.SpanLimits.html
- OpenTelemetry Python SpanLimits documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Java SpanLimitsBuilder Javadocs: https://www.javadoc.io/static/io.opentelemetry/opentelemetry-sdk-trace/1.29.0/io/opentelemetry/sdk/trace/SpanLimitsBuilder.html
- OpenTelemetry Java SdkTracerProviderBuilder Javadocs: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-trace/1.56.0/io/opentelemetry/sdk/trace/SdkTracerProviderBuilder.html
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The Node.js examples used `new Resource(...)` from `@opentelemetry/resources`. OpenTelemetry JavaScript SDK 2.x no longer exports the `Resource` class. Changed both Node.js examples to use `resourceFromAttributes(...)`.
- The Python example used global fallback parameters `max_attributes` and `max_attribute_length` while the comments described span-specific limits. Changed them to `max_span_attributes` and `max_span_attribute_length`.
- The Go example used deprecated `trace.WithSpanLimits(...)`. Changed it to `trace.WithRawSpanLimits(...)`, using limits initialized from `trace.NewSpanLimits()`.
- The environment variable text said the mechanism works across all SDKs. Changed this to the more accurate statement that it applies to SDKs implementing the standard OpenTelemetry environment variables.
- The transform processor examples used older grouped `context` / `statements` syntax and unqualified `attributes`. Updated them to the current documented flat `trace_statements` syntax with `span.attributes` and `spanevent.attributes`.
- The filter processor examples used older `traces.span` configuration and unqualified `attributes`. Updated them to current `trace_conditions` syntax with `span.attributes`.
- The Collector internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current `readers` / `pull` / `prometheus` configuration.
- The monitoring note referenced `otelcol_processor_dropped_*` metrics, which are not a documented current internal metrics pattern. Replaced it with documented Collector logs and internal metrics for processor flow, refused spans, and exporter send failures.

## Review Notes
The corrected examples align with current OpenTelemetry documentation as of 2026-06-15. The Collector transform and filter processors still support some older configuration forms, but the post now uses the current documented forms.
