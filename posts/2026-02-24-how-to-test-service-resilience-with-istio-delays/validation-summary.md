# Validation Summary: How to Test Service Resilience with Istio Delays

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService fault injection
- Istio request timeouts
- Istio DestinationRule connection pools and circuit breaking
- Kubernetes
- Bookinfo sample application
- Fortio load testing
- Envoy sidecar statistics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio Fault Injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio Request Timeouts task: https://istio.io/latest/docs/tasks/traffic-management/request-timeouts/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Circuit Breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Istio Bookinfo application documentation: https://istio.io/latest/docs/examples/bookinfo/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Istio `pilot-agent` command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Fortio documentation: https://fortio.org/

## Issues Found
- The post stated that the delay is added by the Envoy sidecar on the ratings service side. Istio documents HTTP fault injection as a VirtualService policy applied on the client side while forwarding traffic, so the text now says the caller's Envoy sidecar adds the delay before forwarding to ratings.
- The setup commands pinned the Bookinfo sample URLs to Istio `release-1.22`. Those URLs were updated to `release-1.30`, matching the current Istio documentation version and sample manifests.
- The partial-delay and timeout sections used different VirtualService names for the same `ratings` host. Applying the post sequentially could leave multiple VirtualServices for the same host and produce ambiguous behavior. The snippets now reuse `ratings-delay` so each example replaces the previous ratings fault rule.
- The timeout example assumed that reviews always calls ratings. In Bookinfo, `reviews:v1` does not call ratings, so the reviews VirtualService now routes to subset `v2` before applying the 2-second timeout.
- The timeout explanation said productpage should complete in about 2 seconds. Istio's Bookinfo documentation notes that productpage has a hard-coded retry for calls to reviews, so the post now says the request should finish faster than the 5-second ratings delay and may take roughly 4 seconds with a 2-second route timeout.
- The connection-pool section claimed requests would queue above exactly 2 requests per second. That was too specific because the effective limit depends on concurrent in-flight requests and whether HTTP/1.1 or HTTP/2 limits apply, so the text now describes queuing or overflow once configured pool limits are exceeded.

## Review Notes
The Istio `networking.istio.io/v1` VirtualService and DestinationRule fields used in the post are current.
