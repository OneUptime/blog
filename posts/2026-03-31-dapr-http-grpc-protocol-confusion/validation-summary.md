# Validation Summary: How to Fix Dapr HTTP to gRPC Protocol Confusion

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- gRPC
- HTTP/HTTP2 (h2c)
- Kubernetes (annotations for Dapr sidecar configuration)
- Python (gRPC client example)

## Sources Consulted
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr service invocation via gRPC: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-services-grpc/
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr app health checks: https://docs.dapr.io/operations/resiliency/health-checks/app-health/
- Dapr pub/sub subscription methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- gRPC Python API reference: https://grpc.github.io/grpc/python/grpc.html

## Issues Found
1. **Wrong endpoint used for HTTP app health check**: The post used `curl http://localhost:8080/dapr/subscribe` as a way to test HTTP app connectivity. `/dapr/subscribe` is actually the pub/sub programmatic subscription discovery endpoint, not a health check. Changed to `curl http://localhost:8080/healthz`, which is the default Dapr app health check path.

2. **Redundant and non-idiomatic Python gRPC import**: The post had `from grpc import insecure_channel` followed by `import grpc`, then called `insecure_channel(...)` directly. This is redundant (two imports of the same package) and non-idiomatic. The standard pattern across all official gRPC Python examples is `import grpc` then `grpc.insecure_channel(...)`. Fixed to use the idiomatic single import.

## Review Notes
- The default Dapr gRPC port (`50001`) used in the proxy example is correct, though official tutorials sometimes use `50007` to avoid port conflicts when running multiple sidecars locally. This is not an error but worth noting for readers running multi-sidecar setups.
- The cross-protocol translation claim (HTTP caller invoking gRPC target) is correct per Dapr docs, though errors from the gRPC service will surface as HTTP 500 to the caller.
- All Kubernetes annotations are verified correct against the official Dapr annotations reference.
- The `h2c` protocol value and its explanation are accurate.
