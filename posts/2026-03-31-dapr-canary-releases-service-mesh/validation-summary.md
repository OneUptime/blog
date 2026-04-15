# Validation Summary: How to Implement Canary Releases with Dapr and Service Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (service invocation, sidecar annotations, app-id)
- Istio (VirtualService, DestinationRule, header-based routing, weighted traffic splitting)
- Kubernetes (Deployments, kubectl patch)
- Prometheus (promtool, PromQL, alerting rules)
- Envoy (via Istio's istio_requests_total metric)

## Sources Consulted
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Annotations Reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Service Invocation How-To: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- Istio VirtualService Reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule Reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Traffic Shifting Task: https://istio.io/latest/docs/tasks/traffic-management/traffic-shifting/
- Istio v1 APIs Announcement: https://istio.io/latest/blog/2024/v1-apis/
- Kubernetes kubectl patch Documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/

## Issues Found
1. **Outdated Istio API version**: The VirtualService and DestinationRule resources used `apiVersion: networking.istio.io/v1alpha3`. Since Istio 1.22 (released 2024), the networking APIs have been promoted to `networking.istio.io/v1`. Updated both resources to use `apiVersion: networking.istio.io/v1`.

## Review Notes
- The Prometheus alerting rule omits a `for` duration field. This is syntactically valid and arguably intentional for canary rollback scenarios where you want immediate alerting, but production usage may benefit from a short `for` duration (e.g., `for: 2m`) to avoid firing on transient spikes.
- Dapr's default Kubernetes name resolver discovers pods directly by app-id annotation and round-robins across them, which could bypass Istio's VirtualService routing for Dapr-to-Dapr calls. The weighted routing shown would apply to traffic entering through the Kubernetes Service (e.g., from an Istio Gateway or non-Dapr services). For full Istio traffic management of Dapr-to-Dapr invocations, additional Dapr name resolution configuration may be needed. This is a nuance beyond the scope of this introductory guide.
- Two Deployments sharing the same `dapr.io/app-id` is a valid pattern that works due to Dapr's service discovery mechanics, though it is not an officially documented canary strategy from Dapr.
