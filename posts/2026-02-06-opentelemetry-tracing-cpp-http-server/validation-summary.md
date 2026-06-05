# Validation Summary: How to Add OpenTelemetry Tracing to a C++ HTTP Server Application

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry C++
- C++
- Boost.Beast
- Boost.Asio
- HTTP server tracing
- W3C Trace Context propagation
- OTLP gRPC exporter

## Sources Consulted
- OpenTelemetry C++ instrumentation documentation: https://opentelemetry.io/docs/languages/cpp/instrumentation/
- OpenTelemetry C++ getting started guide: https://opentelemetry.io/docs/languages/cpp/getting-started/
- OpenTelemetry C++ API reference for `StartSpanOptions`: https://opentelemetry-cpp.readthedocs.io/en/stable/otel_docs/structopentelemetry_1_1trace_1_1StartSpanOptions.html
- OpenTelemetry C++ API reference for `TextMapCarrier`: https://opentelemetry-cpp.readthedocs.io/en/stable/otel_docs/classopentelemetry_1_1context_1_1propagation_1_1TextMapCarrier.html
- OpenTelemetry C++ API reference for `GlobalTextMapPropagator`: https://opentelemetry-cpp.readthedocs.io/en/stable/otel_docs/classopentelemetry_1_1context_1_1propagation_1_1GlobalTextMapPropagator.html
- OpenTelemetry C++ API reference for `BatchSpanProcessorFactory`: https://opentelemetry-cpp.readthedocs.io/en/stable/otel_docs/classopentelemetry_1_1sdk_1_1trace_1_1BatchSpanProcessorFactory.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry C++ GitHub release notes noting removal of deprecated semantic convention headers: https://github.com/open-telemetry/opentelemetry-cpp/releases
- Boost.Beast documentation: https://www.boost.org/doc/libs/release/libs/beast/doc/html/index.html

## Issues Found
- The post used `trace_api::SemanticConventions` constants without including the old semantic convention header, and those deprecated semantic convention headers have been removed in newer OpenTelemetry C++ releases. Replaced those constants with literal stable semantic convention keys.
- The HTTP span attributes used older names such as `http.method`, `http.target`, `http.flavor`, and `http.status_code`. Updated them to stable keys such as `http.request.method`, `url.path`, `network.protocol.version`, and `http.response.status_code`.
- The server span parent was set from `trace_api::GetSpan(current_ctx)->GetContext()`. Updated it to assign the extracted `context::Context` directly to `StartSpanOptions::parent`, which the C++ API supports and preserves the extracted propagation context.
- The error handling snippet extracted inbound context but did not attach it as the parent span context. Added `options.parent = current_ctx`.
- The router marked 4xx server responses as span errors. OpenTelemetry HTTP semantic conventions require 4xx server span status to remain unset unless instrumentation has additional context. Removed the 4xx error status and set `error.type` only for 5xx responses.
- Child handler spans were started but not made active, so nested work such as the database span would not be parented as intended. Added active scopes for handler spans and the database span.
- The tracing setup used `BatchSpanProcessorFactory::Create(std::move(exporter))`, but the documented factory requires `BatchSpanProcessorOptions`. Added processor options and passed them to `Create`.
- The code extracted W3C `traceparent` headers but never installed `HttpTraceContext` as the global propagator. Added `GlobalTextMapPropagator::SetGlobalPropagator(...)` in tracer initialization.
- The routing snippet used `std::string::starts_with`, which requires C++20. Replaced it with a C++17-compatible prefix check using `rfind(prefix, 0) == 0`.
- The carrier snippet used `nostd::string_view` without defining the `nostd` namespace alias or including the string view header. Added the include and namespace alias.

## Review Notes
The code snippets are still illustrative and omit project-level build configuration and backend-specific OTLP endpoint configuration. A future revision could add a small CMake example and call out the exact OpenTelemetry C++ version used, but those omissions do not make the corrected tracing examples technically inaccurate.
