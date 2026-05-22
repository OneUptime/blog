# Validation Summary: How to Configure Circuit Breaking with DestinationRule

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio DestinationRule
- Istio traffic management
- Envoy circuit breaking and outlier detection
- Kubernetes
- kubectl
- Fortio

## Sources Consulted
- Istio circuit breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The testing section did not state that traffic must come from an Istio-injected client pod for the DestinationRule to affect the outbound call. Updated the text to make that requirement explicit.
- The testing section predicted about 80% 503 responses. Istio's official task shows that overflow behavior is expected but the exact percentage varies, so the text now says to expect some 503 responses and to use Fortio output for the actual percentage.
- The monitoring section omitted `upstream_rq_active_overflow`, which Envoy documents for active request circuit breaker exhaustion. Added it to the key counters.
- The monitoring section used `outlier_detection.ejections_total`, which Envoy now marks deprecated. Replaced it with `outlier_detection.ejections_enforced_total`.

## Review Notes
The DestinationRule API snippets use current `networking.istio.io/v1` fields, including `connectionPool`, `http1MaxPendingRequests`, `http2MaxRequests`, `maxRequestsPerConnection`, `maxRetries`, and outlier detection fields such as `consecutive5xxErrors`, `consecutiveGatewayErrors`, `interval`, `baseEjectionTime`, and `maxEjectionPercent`.
