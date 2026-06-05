# Validation Summary: How to Troubleshoot Attribute Value Truncation When Span Attribute Length

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry SDK attribute limits
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OpenTelemetry Java SDK configuration
- OpenTelemetry Collector transform processor
- OTLP/gRPC export behavior

## Sources Consulted
- OpenTelemetry common specification, attribute limits: https://opentelemetry.io/docs/specs/otel/common/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Python SDK trace API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector OTTL functions documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/

## Issues Found
- The post described SDK truncation as always silent. Updated the wording because the OpenTelemetry specification permits SDKs to emit truncation logs, but does not require every implementation or pipeline to surface warnings.
- The post only documented `OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT`. Added `OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT` and noted that the span-specific limit takes precedence for span attributes.
- The Python `SpanLimits` example used the global `max_attribute_length` option for a span-specific example. Changed it to `max_span_attribute_length`.
- The Go example used deprecated `trace.WithSpanLimits`. Updated it to `trace.NewSpanLimits()` plus `trace.WithRawSpanLimits()` so the attribute value length limit is current and other limit defaults are preserved.
- The Java example used the global attribute length environment variable. Changed it to the span-specific environment variable for the span attribute use case.
- The span events section implied events can bypass length limits. Updated it to clarify that event attributes may still be subject to attribute value length limits, while events are appropriate for exception details.
- The Collector transform processor example used `attributes` paths in a span context. Updated the example to use `span.attributes`, matching the current transform processor documentation.
- The Collector payload section described the limit as an exporter limit. Updated it to describe OTLP/gRPC receiver or backend message size limits and suggested reducing batch sizes or increasing the receive limit when possible.

## Review Notes
The examples are intentionally minimal snippets and assume surrounding application setup such as tracer initialization, exception variables, and configured log correlation. Some attribute names in the examples may be custom or older semantic-convention names in real deployments, but they remain plausible troubleshooting examples for attribute truncation.
