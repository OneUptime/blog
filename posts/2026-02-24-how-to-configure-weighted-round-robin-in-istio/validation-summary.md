# Validation Summary: How to Configure Weighted Round Robin in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecar proxy
- VirtualService
- DestinationRule
- Prometheus / PromQL
- istioctl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio traffic shifting task: https://istio.io/latest/docs/tasks/traffic-management/traffic-shifting/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- Updated Istio resource examples from `networking.istio.io/v1beta1` to the current documented `networking.istio.io/v1` API version for `VirtualService` and `DestinationRule`.
- Corrected the load balancing explanation to state that Istio's default policy is least requests, while round robin is an explicitly configurable policy.
- Corrected the statement that route weights must add up to 100. Istio treats weights as relative proportions, where each destination receives `weight / sum(all weights)` traffic.
- Adjusted the testing explanation to avoid calling the distribution "probabilistic" for weighted round robin and instead note practical causes of imprecision in small samples.

## Review Notes
The examples use short Kubernetes service names such as `payment-service`. This is valid when the `VirtualService` or `DestinationRule` is in the same namespace as the service, but Istio recommends fully qualified service names to avoid namespace ambiguity in larger environments.
