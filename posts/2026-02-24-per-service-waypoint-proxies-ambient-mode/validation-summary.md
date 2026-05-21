# Validation Summary: How to Configure Per-Service Waypoint Proxies in Ambient Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ambient mode
- Istio waypoint proxies
- Kubernetes Gateway API
- Kubernetes Services and labels
- Istio AuthorizationPolicy
- Gateway API HTTPRoute
- Kubernetes HorizontalPodAutoscaler

## Sources Consulted
- Istio Configure waypoint proxies: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio Use Layer 7 features: https://istio.io/latest/docs/ambient/usage/l7-features/
- Istio Troubleshoot issues with waypoints: https://istio.io/latest/docs/ambient/usage/troubleshoot-waypoint/
- Istio Resource Labels reference: https://istio.io/latest/docs/reference/config/labels/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The first `istioctl waypoint apply` example said to use the `--for` flag but omitted it. Added `--for service` to match the stated intent and current `istioctl waypoint apply` usage.
- The declarative Gateway example used `gateway.networking.k8s.io/v1beta1` and omitted the waypoint traffic type label. Updated it to `gateway.networking.k8s.io/v1` and added `istio.io/waypoint-for: service`, matching current Istio-generated waypoint Gateway resources.
- Pod lookup examples used the old/non-reference label `istio.io/gateway-name`. Updated selectors to `gateway.networking.k8s.io/gateway-name`, which is the current Gateway API label applied to generated waypoint pods.
- The "list all waypoint pods" example used a controller-management label value that is not documented as a reliable selector for waypoint pods. Updated it to select pods by `gateway.networking.k8s.io/gateway-class-name=istio-waypoint`.
- The traffic routing example used VirtualService for ambient waypoint routing. Current Istio documentation treats VirtualService support in ambient mode as alpha and documents HTTPRoute as the beta route API for waypoint traffic. Replaced the example with an HTTPRoute attached to the `reviews` Service.

## Review Notes
The remaining examples align with current Istio ambient waypoint behavior: services opt in with `istio.io/use-waypoint`, service-level labels take precedence over namespace-level waypoint labels when the waypoint can handle service traffic, waypoint-backed L7 AuthorizationPolicy uses `targetRefs`, and waypoint deployments can be scaled independently.
