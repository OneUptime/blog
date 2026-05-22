# Validation Summary: How to Configure A/B Testing with Istio VirtualService

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio traffic management
- Kubernetes
- Prometheus metrics
- istioctl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- Updated Istio `apiVersion` values from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` used in the official Istio API examples.
- Corrected the statement that route weights must add up to 100. Istio treats weights as relative proportions and calculates each destination's share as `weight / sum(all weights)`.
- Corrected the session-stickiness guidance for percentage-based routing. DestinationRule consistent hashing provides soft affinity to backend endpoints within the selected destination, but it does not make a weighted v1/v2 route selection sticky for the same user. The post now recommends stable header or cookie assignment when A/B group stickiness matters.

## Review Notes
The VirtualService header, cookie, multi-variant, and combined-match examples are consistent with Istio's HTTP match semantics. The `istioctl proxy-config routes deployment/<name>` usage and the referenced Istio Prometheus metric names and labels are valid according to the official documentation.
