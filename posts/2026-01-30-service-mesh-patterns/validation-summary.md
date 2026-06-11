# Validation Summary: How to Create Service Mesh Patterns

## Status
validated

## Post Type
Hands-on Tutorial / Implementation Guide

## Technologies Covered
- Istio (VirtualService, DestinationRule, PeerAuthentication, AuthorizationPolicy, Telemetry, EnvoyFilter)
- Linkerd (ServiceProfile, SMI TrafficSplit)
- Envoy proxy (sidecar pattern, outlier detection, rate limit filter)
- Kubernetes (Deployments, namespaces, init containers, probes)
- SMI (Service Mesh Interface) TrafficSplit v1alpha1
- Prometheus / Jaeger / Grafana (observability stack)
- Fortio (load testing for circuit breaker validation)
- iptables (sidecar traffic interception)

## Sources Consulted
- Istio Virtual Service reference (HTTPRetry, HTTPFaultInjection, HTTPMatchRequest, mirror/mirrorPercentage): https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference (OutlierDetection, ConnectionPoolSettings): https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio PeerAuthentication and AuthorizationPolicy references: https://istio.io/latest/docs/reference/config/security/
- Istio Telemetry API reference (`telemetry.istio.io/v1alpha1`): https://istio.io/latest/docs/reference/config/telemetry/
- Istio sidecar injection annotations (`sidecar.istio.io/proxyCPU`, `traffic.sidecar.istio.io/*`): https://istio.io/latest/docs/reference/config/annotations/
- Envoy Router filter (default retry jitter / fully-jittered exponential backoff): https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter
- Envoy Rate Limit filter / external rate limit service: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- SMI TrafficSplit v1alpha1 spec (weight is milliunit resource.Quantity): https://github.com/servicemeshinterface/smi-spec/blob/main/apis/traffic-split/v1alpha1/traffic-split.md
- Linkerd ServiceProfile reference (routes, responseClasses, isRetryable, retryBudget): https://linkerd.io/2/reference/service-profiles/
- Linkerd SMI extension docs: https://linkerd.io/2.11/tasks/linkerd-smi/

## Issues Found
1. **Incorrect comment on `retryRemoteLocalities`** (Istio retry section). The post claimed this field "Add[s] jitter to prevent thundering herd". Per Istio's HTTPRetry reference, this boolean controls whether retries may be sent to upstream endpoints in *other localities* (zones/regions). Jitter is not exposed via Istio's HTTPRetry API — Envoy applies its own fully-jittered exponential backoff (default 25 ms base interval) regardless of this flag. Updated the comment to accurately describe the field as "Allow retries to be sent to endpoints in other localities".

2. **Self-contradictory comment in Linkerd ServiceProfile POST route**. The block was annotated "POST requests get limited retries" with an inline comment "Only retry if the response indicates it's safe" — but the actual configuration sets `isRetryable: false`, which disables retries entirely. Replaced both comments with accurate text explaining that POST is non-idempotent and retries are disabled for this route.

## Review Notes
- The `apiVersion: networking.istio.io/v1beta1` group is correct and supported. Istio 1.22+ also serves a stable `v1` for VirtualService/DestinationRule; readers on newer clusters can migrate by changing the apiVersion only.
- `telemetry.istio.io/v1alpha1` is still the served API as of Istio 1.20–1.22. A `v1` Telemetry API was promoted in later versions; readers should consult `kubectl api-resources` for their cluster.
- The "deny-all" `AuthorizationPolicy` with `spec: {}` is technically valid: an ALLOW policy (default action) with no rules will never match a request, effectively denying all traffic to the selected workloads. This is the documented Istio idiom; some operators prefer the more explicit `action: DENY` with a wildcard match.
- The SMI TrafficSplit (`split.smi-spec.io/v1alpha1`) example is correct as written. Note that Linkerd's SMI extension is deprecated in newer Linkerd (2.12+); long-term, readers should migrate to Linkerd's native HTTPRoute / Gateway API resources. This is out of scope for the post's time frame.
- The iptables init-container example uses `--to-port 15001` for both inbound and outbound redirection. In real Istio deployments, inbound traffic uses port 15006 and outbound uses 15001. The example is illustrative for the manual-injection pattern only; the post correctly recommends automatic injection for production.
- The Istio "Cluster-wide strict mTLS" PeerAuthentication is placed in `istio-system`, which is the default Istio root namespace — so the example correctly achieves mesh-wide enforcement. If a deployment uses a non-default root namespace, this would need to change.
- `mirrorPercentage` is the current field name (deprecated `mirror_percent` was removed). Correct as written.
- Envoy and Istio image tags (`envoyproxy/envoy:v1.28.0`, `istio/proxyv2:1.20.0`, `envoyproxy/ratelimit:latest`) are valid published tags. The use of `:latest` in the rate-limit deployment is acknowledged anti-pattern but is consistent with upstream Envoy ratelimit examples.
