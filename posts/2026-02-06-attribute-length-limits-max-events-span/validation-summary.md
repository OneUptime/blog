# Validation Summary: How to Set Attribute Value Length Limits and Max Events Per Span to Prevent SDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry SDK span limits
- OpenTelemetry SDK environment variables
- OpenTelemetry Python SDK
- OpenTelemetry Java SDK
- OpenTelemetry Go SDK
- OTLP trace exporters

## Sources Consulted
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry trace SDK specification, Span Limits: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Python SDK trace source documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Java SDK documentation, SpanLimits: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace

## Issues Found
- The Go example used `sdktrace.WithSpanLimits`, which is deprecated in the current Go SDK. Updated it to `sdktrace.WithRawSpanLimits`, the current API documented by the Go SDK.
- The environment variable example omitted `OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT`, the span-specific attribute value length limit. Added it and clarified that global attribute limits act as fallbacks where supported.
- The post stated that attributes and events beyond limits are always silently dropped and that the first N attributes are kept. Current SDK behavior varies; for example, Go and Python can evict older events/attributes. Updated the wording to describe dropping, eviction, and truncation accurately.
- The Python example claimed only the first 64 attributes are kept. Updated the comment to say the SDK keeps at most 64 and that some SDKs evict older attributes.
- The logging snippet claimed the SDK logs debug messages when limits are applied. The OpenTelemetry specification only says SDKs should log discarded attributes/events/links at most once per span, and exported spans expose dropped counts. Replaced the snippet with guidance to monitor dropped attribute/event/link counts.

## Review Notes
- The default limit table matches the OpenTelemetry specification: 128 for span attributes, events, links, event attributes, and link attributes, with no default attribute value length limit.
- The Python and Java `SpanLimits` APIs shown are current and match official SDK documentation.
- The memory calculation is intentionally rough and useful as a sizing illustration, but actual heap use varies by SDK implementation, exporter, attribute types, and queue settings.
