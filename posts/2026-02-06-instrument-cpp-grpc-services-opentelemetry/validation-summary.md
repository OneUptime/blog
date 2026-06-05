# Validation Summary: How to Instrument C++ gRPC Services with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C++
- gRPC C++
- Protocol Buffers
- OpenTelemetry C++
- OpenTelemetry trace context propagation
- OpenTelemetry RPC semantic conventions
- CMake

## Sources Consulted
- gRPC C++ `ClientRpcInfo` API: https://grpc.github.io/grpc/cpp/classgrpc_1_1experimental_1_1_client_rpc_info.html
- gRPC C++ `ServerRpcInfo` API: https://grpc.github.io/grpc/cpp/classgrpc_1_1experimental_1_1_server_rpc_info.html
- gRPC C++ `InterceptorBatchMethods` API: https://grpc.github.io/grpc/cpp/classgrpc_1_1experimental_1_1_interceptor_batch_methods.html
- gRPC C++ custom channel/interceptor API: https://grpc.github.io/grpc/cpp/namespacegrpc_1_1experimental.html
- gRPC C++ basics and Protocol Buffers workflow: https://grpc.io/docs/languages/cpp/basics/
- OpenTelemetry C++ instrumentation guide: https://opentelemetry.io/docs/languages/cpp/instrumentation/
- OpenTelemetry C++ `Tracer` API: https://opentelemetry-cpp.readthedocs.io/en/latest/otel_docs/classopentelemetry_1_1trace_1_1Tracer.html
- OpenTelemetry C++ `TextMapCarrier` API: https://opentelemetry-cpp.readthedocs.io/en/latest/otel_docs/classopentelemetry_1_1context_1_1propagation_1_1TextMapCarrier.html
- OpenTelemetry C++ `TextMapPropagator` API: https://opentelemetry-cpp.readthedocs.io/en/latest/otel_docs/classopentelemetry_1_1context_1_1propagation_1_1TextMapPropagator.html
- OpenTelemetry C++ trace context helpers: https://opentelemetry-cpp.readthedocs.io/en/v1.8.3/otel_docs/program_listing_file__home_docs_checkouts_readthedocs.org_user_builds_opentelemetry-cpp_checkouts_v1.8.3_api_include_opentelemetry_trace_context.h.html
- OpenTelemetry C++ `BatchSpanProcessorFactory` API: https://opentelemetry-cpp.readthedocs.io/en/stable/otel_docs/classopentelemetry_1_1sdk_1_1trace_1_1BatchSpanProcessorFactory.html
- OpenTelemetry C++ `TracerProviderFactory` API: https://opentelemetry-cpp.readthedocs.io/en/latest/otel_docs/classopentelemetry_1_1sdk_1_1trace_1_1TracerProviderFactory.html
- OpenTelemetry gRPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/grpc/
- OpenTelemetry RPC semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/rpc-migration/

## Issues Found
- The server interceptor used `info_->server_context()->status()`, but gRPC C++ exposes the status being sent through `InterceptorBatchMethods::GetSendStatus()` at `PRE_SEND_STATUS`. Updated the server interceptor to read the status from `methods->GetSendStatus()`.
- The client interceptor used `info_->client_context()->status()`, but gRPC C++ exposes received status through `InterceptorBatchMethods::GetRecvStatus()` at `POST_RECV_STATUS`. Updated the client interceptor accordingly.
- The code used `info_->service()` on `ClientRpcInfo` and `ServerRpcInfo`, but those APIs expose the fully specified method name, not a separate service accessor. Removed the invalid calls and normalized `info_->method()` for span names and `rpc.method`.
- The propagation example injected context with `current_ctx.SetValue("active_span", span_)`, which is not the OpenTelemetry C++ trace context helper. Replaced it with `trace_api::SetSpan(current_ctx, span_)`.
- The interceptor stored `trace_api::Scope` as a default-constructed member, but the OpenTelemetry C++ scope object is constructed from a span. Updated the code to store `std::unique_ptr<trace_api::Scope>`.
- The snippets used older RPC semantic convention attributes: `rpc.system`, `rpc.service`, and `rpc.grpc.status_code`. Updated them to `rpc.system.name`, `rpc.method`, `rpc.response.status_code`, and `error.type` where appropriate.
- The client snippet used `net.peer.name` with `GetLoadBalancingPolicyName()`, which is not the current recommended semantic convention for identifying the configured server target. Updated the client interceptor factory to accept `server.address` and `server.port`.
- The OpenTelemetry SDK setup omitted required/current includes and `BatchSpanProcessorOptions`. Added the relevant headers and passed options to `BatchSpanProcessorFactory::Create`.
- The CMake gRPC plugin generator expression was escaped as `\$<TARGET_FILE:gRPC::grpc_cpp_plugin>`, which would prevent CMake from evaluating it as a generator expression. Removed the escape.
- The CMake linkage omitted `opentelemetry-cpp::api`, which is part of the documented imported target set for applications using the OpenTelemetry C++ API. Added it to the server and client targets.
- The service implementation snippet used `std::this_thread::sleep_for` and `std::chrono::milliseconds` without including `<thread>` and `<chrono>`. Added the missing includes.

## Review Notes
The post still uses gRPC C++ experimental interceptor APIs, which are valid in the referenced gRPC C++ documentation but should be called out as experimental in future revisions. The CMake snippet is a concise illustrative setup; real projects may need package-manager-specific OpenTelemetry and gRPC target names depending on how those dependencies are installed.
