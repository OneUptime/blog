# Validation Summary: How to Implement Retry Pattern with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Envoy retry policies
- Kubernetes custom resources
- Prometheus / PromQL
- gRPC retry conditions

## Sources Consulted
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio MeshConfig API reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy router retry documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy route retry policy API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html

## Issues Found
- Updated Istio resource examples from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API used by current Istio documentation.
- Corrected the default retry conditions by removing `retriable-status-codes` from the VirtualService default retry list and clarifying that `unavailable` is a gRPC status code, not an HTTP 503 response.
- Fixed the specific-status-code retry example. The original example set `retryOn: "retriable-status-codes"` and `retryRemoteLocalities: true`, but did not actually configure any status codes. It now uses `retryOn: "503,504"`, which Istio documents as the supported way to include concrete HTTP status codes.
- Corrected the backoff section. Istio's `HTTPRetry` includes a `backoff` field, so the post no longer says VirtualService cannot configure backoff.
- Adjusted the Envoy backoff explanation to describe fully jittered exponential backoff rather than fixed 25ms, 50ms, 100ms sleeps.
- Clarified idempotency wording so the default retry behavior is described as a small set of connection-level failures and gRPC retry conditions, rather than connection-level failures only.
- Changed the retry overflow guidance from increasing the "retry budget" to increasing the retry limit, matching the `maxRetries` example used in the post.

## Review Notes
The PromQL examples use Envoy retry counters that may require Envoy statistics inclusion configuration in some Istio installations, depending on proxy stats settings. The examples are directionally correct for environments exporting those Envoy cluster metrics.
