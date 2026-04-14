# Validation Summary: How to Configure Dapr for Low Latency Applications

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, service invocation, configuration)
- gRPC / HTTP/2
- Unix Domain Sockets
- Kubernetes (annotations, QoS classes, node affinity)
- Go (Dapr Go SDK)
- Python (Dapr client connection)
- wrk (HTTP benchmarking tool)

## Sources Consulted
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Go SDK client documentation: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr Go SDK source (GitHub): https://github.com/dapr/go-sdk
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr tracing configuration: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr metrics configuration: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Kubernetes production guidelines for Dapr: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/

## Issues Found
1. **Go SDK `InvokeMethod` incorrect 4th parameter**: The blog passed `"application/json"` (a content type) as the 4th argument to `client.InvokeMethod()`. The actual signature is `InvokeMethod(ctx, appID, methodName, httpMethod)` where the 4th parameter is the HTTP verb (e.g., `"post"`, `"get"`), not a content type. Changed `"application/json"` to `"post"`. To send data with a content type, one would use `InvokeMethodWithContent` with a `dapr.DataContent` struct instead.

## Review Notes
- The `dapr.io/enable-metrics: "false"` annotation is correct for disabling metrics at the pod level. An alternative approach is disabling metrics globally via the Dapr Configuration resource (`spec.metrics.enabled: false`). Both are valid; the blog's approach is fine for per-service tuning.
- The Python UDS example references `DAPR_UNIX_DOMAIN_SOCKET_PATH` as an environment variable. This is not automatically set by Dapr; applications need to be explicitly configured with the socket path. The example is reasonable as illustrative code but readers should be aware the env var must be set manually or via pod spec.
- The Unix Domain Sockets feature is Linux-only and not available on Windows, which is not mentioned in the post. This may be worth noting in a future revision.
