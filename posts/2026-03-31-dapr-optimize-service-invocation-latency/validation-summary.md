# Validation Summary: How to Optimize Dapr Service Invocation Latency

## Status
validated

## Post Type
Tutorial / Performance Optimization Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — service invocation, mTLS, distributed tracing
- gRPC / HTTP/2
- Kubernetes (pod affinity, annotations)
- Node.js / JavaScript (`@dapr/dapr` SDK, `http` module)
- Zipkin (distributed tracing)
- hey (HTTP load testing tool)

## Sources Consulted
- Dapr JS SDK GitHub repository and published typings (v3.x) — https://github.com/dapr/js-sdk
- Dapr official documentation: service invocation — https://docs.dapr.io/developing-applications/building-blocks/service-invocation/
- Dapr official documentation: Dapr annotations — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr official documentation: mTLS configuration — https://docs.dapr.io/operations/security/mtls/
- Dapr official documentation: distributed tracing with Zipkin — https://docs.dapr.io/operations/observability/tracing/
- Kubernetes documentation: pod affinity — https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- hey HTTP load testing tool — https://github.com/rakyll/hey

## Issues Found
1. **Incorrect SDK export name `CommunicationProtocol`**: The blog used `CommunicationProtocol` when importing from `@dapr/dapr`. The correct export name is `CommunicationProtocolEnum`. This would cause a runtime error (`undefined` destructuring). Fixed the import and usage to `CommunicationProtocolEnum.GRPC`.

2. **Raw string `'POST'` instead of `HttpMethod` enum**: The `client.invoker.invoke()` call passed the raw string `'POST'`, but the SDK's `method` parameter is typed as `HttpMethod` (an enum with lowercase string values like `"post"`). Passing `'POST'` (uppercase) could cause a type mismatch or unexpected behavior. Fixed by importing `HttpMethod` from `@dapr/dapr` and using `HttpMethod.POST`.

## Review Notes
- The "30-50% lower latency" claim for gRPC vs HTTP is a reasonable ballpark based on general benchmarks, though actual results depend heavily on payload size, connection reuse patterns, and environment. The post qualifies this with "typically," which is appropriate.
- The recommendation to disable mTLS includes an appropriate caveat about only doing so in network-isolated namespaces. This is good practice — disabling mTLS is a significant security trade-off.
- The `dapr.io/enable-api-logging: "false"` annotation in the keep-alive section is tangential to keep-alives. It disables API logging which may reduce some overhead, but it is not directly related to connection reuse. This is not incorrect, but could be slightly misleading in context.
- All Kubernetes YAML (annotations, Configuration CRDs, pod affinity rules) verified correct against current Dapr and Kubernetes specs.
