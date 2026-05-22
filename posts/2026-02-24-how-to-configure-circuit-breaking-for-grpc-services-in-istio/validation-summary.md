# Validation Summary: How to Configure Circuit Breaking for gRPC Services in Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio DestinationRule and VirtualService
- Envoy circuit breaking and outlier detection
- gRPC over HTTP/2
- Kubernetes
- Prometheus metrics
- ghz and Fortio load testing

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio v1 API announcement: https://istio.io/latest/blog/2024/v1-apis/
- Envoy circuit breaking documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking
- Envoy outlier detection documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- gRPC status codes guide: https://grpc.io/docs/guides/status-codes/
- gRPC over HTTP/2 protocol: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
- ghz usage and options: https://ghz.sh/docs/usage and https://ghz.sh/docs/options
- Fortio project documentation: https://github.com/fortio/fortio

## Issues Found
- Updated Istio examples from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API, matching Istio's v1 networking APIs.
- Corrected the HTTP/1.1 explanation so `http1MaxPendingRequests` is described as a pending-request queue limit, not as a direct active-concurrency limit.
- Corrected the `http2MaxRequests` explanation so it is described as an active request limit to the destination, not a value evenly divided across HTTP/2 connections.
- Clarified that gRPC normally uses HTTP/2 `:status` 200 with `grpc-status` trailers, while Envoy maps `grpc-status` to HTTP-style status codes for outlier detection.
- Clarified the relationship between `consecutiveGatewayErrors` and `consecutive5xxErrors`: gateway errors are a subset of 5xx errors, so `consecutiveGatewayErrors` only has an effect alongside `consecutive5xxErrors` when set lower.
- Corrected the circuit-breaker overflow explanation: Envoy rejects overflowed requests with HTTP 503, which gRPC clients surface as UNAVAILABLE.
- Corrected the `maxRequestsPerConnection` streaming guidance to describe connection draining and churn instead of claiming it forcibly terminates active streams.
- Corrected the retry and `perTryTimeout` explanation: `perTryTimeout` applies per attempt, including the initial call, and retries generally cannot recover an already-established stream after response data has started.
- Replaced the placeholder `kubectl run ghz --image=ghz-image` command with a direct `ghz` command matching the official ghz CLI syntax.

## Review Notes
The configuration examples are syntactically valid for current Istio networking APIs. The Prometheus Envoy metric label for `envoy_cluster_upstream_rq_active` can vary depending on scraping/tag extraction configuration, so operators may need to inspect their actual `/stats/prometheus` output before copying the label selector exactly.
