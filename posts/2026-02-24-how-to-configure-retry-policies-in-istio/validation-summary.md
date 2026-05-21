# Validation Summary: How to Configure Retry Policies in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Envoy retry policies
- Kubernetes kubectl commands
- HTTP and gRPC retry behavior

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Envoy router retry documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy route RetryPolicy API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy access log response flags: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html

## Issues Found
- The post listed Istio's default `retryOn` value as `connect-failure,refused-stream,unavailable,cancelled,retriable-status-codes`. Updated it to the documented default: `connect-failure,refused-stream,unavailable,cancelled`.
- The per-try timeout guidance divided the route timeout by `attempts`, but Istio's `attempts` field is the number of retries, so the maximum total attempts is `1 + attempts`. Updated the guidance and example to account for the initial request.
- The backoff section said Istio VirtualService has no direct option for backoff duration and showed `retryRemoteLocalities`. Updated the example to use the current `backoff` field and corrected the explanation.
- Updated Istio resource examples from `networking.istio.io/v1beta1` to the current documented `networking.istio.io/v1` API version.
- The monitoring section described access-log and Envoy admin-stat checks as Istio metrics. Updated the wording to "access logs and Envoy stats."

## Review Notes
The remaining retry condition names, `retryRemoteLocalities`, `retryIgnorePreviousHosts` behavior, DestinationRule fields, Envoy response flag `URX`, and retry statistic names were consistent with current official Istio and Envoy documentation.
