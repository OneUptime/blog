# Validation Summary: How to Set Up Weighted Traffic Splitting with VirtualService

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Kubernetes Deployments and Services
- Istio Gateway routing
- istioctl
- Prometheus / PromQL
- Canary and blue-green deployment patterns

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio traffic shifting task: https://istio.io/latest/docs/tasks/traffic-management/traffic-shifting/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy weighted cluster API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html

## Issues Found
- The `istioctl proxy-config routes` example used `deploy/my-service-v1`. The Istio command reference documents deployment targets as `deployment/<deployment-name[.namespace]>`, so the command was changed to `deployment/my-service-v1`.
- The PromQL examples and automation script filtered on `destination_workload="my-service"`, but the sample Kubernetes workloads are named `my-service-v1` and `my-service-v2`. Istio's `destination_workload` label identifies the destination workload name, so those filters would not match the sample deployments. The filters were changed to `destination_service_name="my-service"` while keeping `destination_version` for version grouping.
- The common pitfall said Istio requires route weights to sum to 100 and may reject other totals. Istio's VirtualService reference defines route weights as relative proportions, with each destination receiving `weight / sum(all weights)`. The text was corrected to say that totals of 100 are a readability convention for percentages.
- The session affinity note implied that DestinationRule consistent hashing should be used instead of weights for sticky version selection. DestinationRule consistent hashing applies to backend host selection within the chosen destination and does not make weighted subset choice sticky. The text now recommends explicit match rules such as a header or cookie when version stickiness is required.

## Review Notes
- The VirtualService and DestinationRule snippets use the current `networking.istio.io/v1` API and valid fields.
- The short host name `my-service` is valid because the resources are shown in the same namespace, but Istio recommends fully qualified service names to avoid cross-namespace ambiguity in production.
