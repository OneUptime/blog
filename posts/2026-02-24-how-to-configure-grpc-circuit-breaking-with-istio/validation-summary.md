# Validation Summary: How to Configure gRPC Circuit Breaking with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy
- gRPC
- Kubernetes
- DestinationRule configuration
- Circuit breaking and outlier detection

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio circuit breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Envoy circuit breaking documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking
- Envoy outlier detection documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy gRPC status mapping source: https://github.com/envoyproxy/envoy/blob/main/source/common/grpc/status.cc
- gRPC status code reference: https://grpc.io/docs/guides/status-codes/

## Issues Found
- The original gRPC-specific error mapping incorrectly listed `CANCELLED` and `RESOURCE_EXHAUSTED` as codes counted by `consecutive5xxErrors`. Envoy's outlier detection maps `grpc-status` to HTTP status first, and those codes map to non-5xx HTTP statuses. Updated the list to include the gRPC statuses that map to HTTP 5xx responses: `UNKNOWN`, `DEADLINE_EXCEEDED`, `UNIMPLEMENTED`, `INTERNAL`, `UNAVAILABLE`, and `DATA_LOSS`.
- The original connection-pool explanation said Envoy returns `UNAVAILABLE` directly when limits are hit. Updated it to clarify that Envoy fails the request immediately and gRPC clients typically see `UNAVAILABLE` because Envoy's local HTTP 503 response maps to gRPC status 14.

## Review Notes
The Istio `DestinationRule` field names and examples are valid. Current Istio documentation shows `apiVersion: networking.istio.io/v1` in examples, but `networking.istio.io/v1beta1` remains a valid served API version for these resources. The monitoring counters mentioned in the post are consistent with Envoy's cluster statistics, though `upstream_rq_active_overflow` can also be relevant for request circuit breaking in newer Envoy versions.
