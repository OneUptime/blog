# Validation Summary: How to Configure OpenTelemetry C++ with OTLP gRPC and HTTP Exporters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry C++
- OTLP
- gRPC
- HTTP
- Protobuf
- CMake

## Sources Consulted
- OpenTelemetry C++ v1.26.0 release: https://github.com/open-telemetry/opentelemetry-cpp/releases/tag/v1.26.0
- OpenTelemetry C++ OTLP gRPC exporter options: https://github.com/open-telemetry/opentelemetry-cpp/blob/v1.26.0/exporters/otlp/include/opentelemetry/exporters/otlp/otlp_grpc_client_options.h
- OpenTelemetry C++ OTLP HTTP exporter options: https://github.com/open-telemetry/opentelemetry-cpp/blob/v1.26.0/exporters/otlp/include/opentelemetry/exporters/otlp/otlp_http_exporter_options.h
- OpenTelemetry C++ batch span processor factory: https://github.com/open-telemetry/opentelemetry-cpp/blob/v1.26.0/sdk/include/opentelemetry/sdk/trace/batch_span_processor_factory.h
- OpenTelemetry C++ OTLP examples: https://github.com/open-telemetry/opentelemetry-cpp/tree/v1.26.0/examples/otlp
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Protocol specification: https://opentelemetry.io/docs/specs/otlp/

## Issues Found
- The post described the gRPC exporter as having "streaming capabilities." OTLP/gRPC uses gRPC over HTTP/2, but the trace export service is not presented as a streaming exporter API in the C++ examples. Reworded this to focus on HTTP/2 and high-volume suitability.
- The post stated that both exporters serialize data using Protobuf. OTLP/gRPC uses Protobuf, while OTLP/HTTP supports binary Protobuf and JSON. Updated the explanation.
- The gRPC endpoint default comment omitted the scheme used by current OpenTelemetry C++ defaults. Updated it to `http://localhost:4317`.
- The secure gRPC snippet used `secure_options.ssl_credentials`, which is not a standard `OtlpGrpcExporterOptions` field in current OpenTelemetry C++. Replaced it with `ssl_credentials_cacert_path`.
- Several tracer provider snippets passed a `std::unique_ptr` provider directly to `trace_api::Provider::SetTracerProvider`. Updated them to move the SDK provider into a `std::shared_ptr<trace_api::TracerProvider>` first.
- The complete example included `opentelemetry/sdk/resource/semantic_conventions.h`, which is not present in current OpenTelemetry C++ v1.26.0. Replaced the constants with current semantic convention attribute keys.
- The complete batch processor example did not flush before program exit. Updated it to keep the SDK provider and call `ForceFlush()`.
- The switching and environment examples called `BatchSpanProcessorFactory::Create(std::move(exporter))`, but current OpenTelemetry C++ requires `BatchSpanProcessorOptions`. Added default options.
- The protocol-switching example only handled `"http"`, while OpenTelemetry environment variables use values such as `"grpc"`, `"http/protobuf"`, and `"http/json"`. Updated the example to handle those values.
- Added missing includes needed by the corrected snippets, including `<memory>`, `<stdexcept>`, `otlp_http.h`, gRPC exporter options, batch processor options, and SDK tracer provider.

## Review Notes
The post is now aligned with the current OpenTelemetry C++ v1.26.0 exporter APIs. The examples are still illustrative snippets and assume the surrounding OpenTelemetry C++ dependencies and exporter components are installed and enabled in the build.
