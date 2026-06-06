# Validation Summary: How to Configure Max Events Per Span and Max Links Per Span

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing specification
- OpenTelemetry SDK span limits
- OpenTelemetry Python SDK
- OpenTelemetry Java SDK
- OpenTelemetry JavaScript / Node.js SDK
- OpenTelemetry SDK environment variables

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Python SDK trace documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Java SDK exporter and SpanLimits documentation: https://opentelemetry.io/docs/languages/java/exporters/
- OpenTelemetry JavaScript NodeTracerProvider API documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-node.NodeTracerProvider.html
- OpenTelemetry JavaScript TracerConfig API documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-node.TracerConfig.html
- OpenTelemetry JavaScript SpanLimits API documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.node.SpanLimits.html
- OpenTelemetry Protocol / non-OTLP dropped-count mapping documentation: https://opentelemetry.io/docs/specs/otel/common/mapping-to-non-otlp/

## Issues Found
- The Python `SpanLimits` constructor description listed `max_span_attribute_value_length`, which is not a current Python SDK constructor argument. Changed it to the current `max_attribute_length` and `max_span_attribute_length` names, and added `max_span_attributes`.
- The Python event-limit example said only the first 64 events would be kept. The specification allows SDKs to discard events beyond the configured limit but does not guarantee retention order, so the wording now says only 64 are kept and the other 36 are counted as dropped.
- The Node.js example used `provider.addSpanProcessor(...)`, which is not present in the current `NodeTracerProvider` API. Updated the example to configure `spanProcessors` in the `NodeTracerProvider` constructor.
- The post described dropped events and links as "silently" dropped. The OpenTelemetry specification recommends an SDK log message at most once per span, so the wording now says they are dropped without raising an application error.

## Review Notes
The Java and environment-variable examples match current OpenTelemetry documentation. The dropped-count field names are accurate for OTLP/protobuf-style data, while individual SDK console exporters may display language-specific property names or JSON casing.
