# Validation Summary: How to Create OpenTelemetry Attribute Limits

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry SDK span limits
- OpenTelemetry JavaScript / TypeScript SDK
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OpenTelemetry Java SDK
- OpenTelemetry Collector
- OpenTelemetry Collector transform, filter, memory limiter, attributes, and batch processors
- Docker Compose
- Kubernetes ConfigMap

## Sources Consulted
- OpenTelemetry JavaScript `SpanLimits` API: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-base.SpanLimits.html
- OpenTelemetry JavaScript Node SDK configuration: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry Python `opentelemetry.sdk.trace` documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Go `sdk/trace` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Java SDK documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Java semantic conventions artifact documentation: https://github.com/open-telemetry/semantic-conventions-java
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector OTTL functions documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md

## Issues Found
- The Node.js example used `new Resource(...)`, which no longer matches the current documented resource construction pattern. Updated it to `resourceFromAttributes(...)` and made the `SpanLimits` import type-only.
- The Python example used global fallback limit parameters (`max_attributes`, `max_attribute_length`) while describing span-specific limits. Updated them to `max_span_attributes` and `max_span_attribute_length`.
- The Go section described a builder pattern, but the example uses the `SpanLimits` struct returned by `sdktrace.NewSpanLimits()`. Updated the wording.
- The Java example imported the old semantic convention `ResourceAttributes` class. Replaced it with stable `AttributeKey.stringKey(...)` resource attributes to avoid stale/deprecated semconv APIs.
- The custom TypeScript attribute validator imported `SpanStatusCode` without using it. Removed the unused import.
- The custom TypeScript span processor only truncated values when the span exceeded the attribute count limit and did not apply `maxEventCount`. Updated the logic to apply both value length and event count limits consistently.
- The Collector transform examples used ambiguous paths such as `attributes` and attempted `truncate_all(body, ...)` on a log body. Updated the examples to use explicit OTTL paths (`span.attributes`, `spanevent.attributes`, `log.attributes`) and `Substring(...)` for log body truncation.
- The Collector filter examples used older nested `traces.span` / `logs.log_record` style and lowercase `len(...)`. Updated them to current `trace_conditions` / `log_conditions`, `Len(...)`, explicit OTTL paths, and `error_mode: ignore`.
- The memory limiter example combined fixed MiB and percentage settings even though fixed `limit_mib` takes precedence. Removed the percentage settings from that fixed-limit example.
- The monitoring TypeScript snippet referenced `Span` without importing it. Added the missing import.

## Review Notes
The examples remain version-sensitive because OpenTelemetry SDK and Collector APIs evolve quickly. The Collector filter processor's current documented syntax applies to collector-contrib v0.146.0 and later; older configuration remains supported but is no longer the preferred documentation style.
