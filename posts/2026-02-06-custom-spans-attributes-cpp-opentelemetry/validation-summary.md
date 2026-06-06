# Validation Summary: How to Create Custom Spans and Add Attributes in C++ with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry C++
- C++
- Distributed tracing
- OpenTelemetry spans, attributes, events, status codes, links, and semantic conventions

## Sources Consulted
- OpenTelemetry C++ instrumentation documentation: https://opentelemetry.io/docs/languages/cpp/instrumentation/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry C++ `Tracer` API header: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/api/include/opentelemetry/trace/tracer.h
- OpenTelemetry C++ `Span` API header: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/api/include/opentelemetry/trace/span.h
- OpenTelemetry C++ `StartSpanOptions` API header: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/api/include/opentelemetry/trace/span_startoptions.h
- OpenTelemetry C++ `AttributeValue` API header: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/api/include/opentelemetry/common/attribute_value.h
- OpenTelemetry C++ semantic convention headers: https://github.com/open-telemetry/opentelemetry-cpp/tree/main/api/include/opentelemetry/semconv
- OpenTelemetry semantic conventions documentation: https://opentelemetry.io/docs/specs/semconv/

## Issues Found
- The span scope section incorrectly said scope destruction ends spans. I changed it to state that `WithActiveSpan` only controls the active span lifetime and that `End()` should still be called.
- The semantic convention example used the outdated `opentelemetry/trace/semantic_conventions.h` include and `trace_api::SemanticConventions` constants. I updated it to the current generated `opentelemetry/semconv/http_attributes.h` and `opentelemetry/semconv/url_attributes.h` constants.
- The start-time example set only `start_system_time`. Current `StartSpanOptions` documentation says both system and steady timestamps must be provided when overriding the start time, so I added `start_steady_time`.
- The complex attribute example claimed nested structures and used `std::vector<AttributeValue>`, which is not a supported span attribute value. I changed it to homogeneous array attributes using `opentelemetry::nostd::span`.
- The span links example used a nonexistent `SpanContextKeyValueIterable::Entry` type and `options.links` field. I changed it to pass links through the `StartSpan` overload that accepts a span-context/key-value iterable.
- The performance example used nonexistent `Provider::GetNoopTracerProvider()`. I changed it to use the current tracer `Enabled()` API.
- Several exception paths set error status and rethrew before calling `End()`. I added `End()` calls before rethrowing and updated the best practice wording.
- The span-kind example started spans without ending them. I added matching `End()` calls.
- Minor terminology was updated from "instrumentation library" to "instrumentation scope", and events were described as timestamped annotations rather than logs.

## Review Notes
The examples remain illustrative and omit full application setup for exporters and SDK initialization, which is acceptable for this post's scope. The `Tracer::Enabled()` API is part of current OpenTelemetry C++ ABI v2; projects pinned to older ABI v1 may need a different performance guard.
