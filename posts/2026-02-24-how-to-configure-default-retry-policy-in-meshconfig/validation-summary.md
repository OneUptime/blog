# Validation Summary: How to Configure Default Retry Policy in MeshConfig

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio MeshConfig
- IstioOperator
- Istio VirtualService
- Istio DestinationRule
- Envoy HTTP retries and retry metrics
- Kubernetes CLI usage

## Sources Consulted
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- IstioOperator reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy router retry policy documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html

## Issues Found
- The post claimed Istio has a default per-retry timeout of 25 seconds. Updated this to reflect that `perTryTimeout` defaults to the route timeout, and that there is no separate per-try timeout when the route timeout is disabled.
- The MeshConfig example configured `perTryTimeout` under `defaultHttpRetryPolicy`. Removed it because Istio currently documents that all retry policy settings except `perTryTimeout` can be configured globally through MeshConfig.
- The explanation of `perTryTimeout` described only retry attempts. Updated it to match Istio's definition: it applies to each attempt, including the initial call and retries.
- The `retriable-status-codes` description incorrectly tied status-code configuration to `retryRemoteLocalities`. Updated it to describe status codes in retry policy configuration or `x-envoy-retriable-status-codes`.
- Updated Istio networking examples from `networking.istio.io/v1beta1` to the current documented `networking.istio.io/v1` API version.
- Corrected the timeout math. `attempts` is the number of retries, so the maximum number of requests is `attempts + 1`; the timeout formula now accounts for the original request plus retries and retry backoff.
- Updated the best-practices line that suggested configuring mesh-wide per-try timeouts, since those must be configured per route.

## Review Notes
The post is technically relevant and remains a useful guide after correction. The `maxRetries` circuit breaker example is valid, but it should be understood as a cap on outstanding retries rather than a full retry-budget feature.
