# Validation Summary: How to Set Up Least Request Load Balancing in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy load balancing
- Kubernetes
- DestinationRule
- istioctl
- YAML configuration

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio debugging Envoy and Istiod guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Envoy supported load balancers documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers.html
- Envoy least request load balancing policy API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/load_balancing_policies/least_request/v3/least_request.proto

## Issues Found
- The description and opening explanation implied that Istio/Envoy always routes to the globally least-loaded pod. Envoy's equal-weight least-request implementation uses power-of-two-choices by default, so the wording was changed to say it favors pods with fewer active requests.
- The "Why Least Request Matters" section said new requests "will get routed elsewhere" when a pod has more in-flight requests. That was changed to "are more likely to get routed elsewhere" to match the probabilistic algorithm.
- The test scenario said the sample Deployment created artificially slower pods, but the `hashicorp/http-echo` configuration did not introduce any per-pod delay. The wording was corrected to describe it as a simple multi-pod service for testing the DestinationRule.
- The per-subset example omitted Istio's caveat that subset-level traffic policies take effect when traffic is routed to that subset. A short note was added after the snippet.
- The cleanup commands deleted `api-service-lr` but missed the `slow-fast-lr` DestinationRule created earlier. The missing delete command was added.

## Review Notes
Istio's current documentation says `LEAST_REQUEST` is preferred over `ROUND_ROBIN` in many cases, and `LEAST_CONN` is deprecated in favor of `LEAST_REQUEST`. The configuration snippets use current `networking.istio.io/v1` `DestinationRule` fields.
