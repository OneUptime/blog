# Validation Summary: How to Configure Traffic Routing for Serverless Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Knative Serving
- Istio VirtualService
- Istio traffic routing, retries, timeouts, and mirroring
- Flagger progressive delivery

## Sources Consulted
- Knative Serving traffic management documentation: https://knative.dev/docs/serving/traffic-management/
- Knative Istio ingress gateway documentation: https://knative.dev/docs/serving/setting-up-custom-ingress-gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Flagger Knative canary deployment documentation: https://docs.flagger.app/main/tutorials/knative-progressive-delivery

## Issues Found
- The post used `networking.istio.io/v1beta1` for Istio VirtualService examples. Istio's current reference examples use `networking.istio.io/v1`, so the examples were updated to the current stable API version.
- Several examples routed directly to `my-function-v1.default.svc.cluster.local` or `my-function-v2.default.svc.cluster.local`. Knative traffic tags create addressable target URLs and corresponding Kubernetes Services using names such as `canary-my-function`, so those examples were updated to route to `stable-my-function.default.svc.cluster.local` and `canary-my-function.default.svc.cluster.local`.
- The header-routing setup tagged only the canary revision while the VirtualService text claimed the default route went to v1. The stable revision is now tagged as `stable`, and the default route points to the generated stable target Service.
- The weighted rollout section used a DestinationRule with subsets selected by Knative revision labels against the main Knative Service host. That is not a reliable pattern for Knative traffic targets, because Knative exposes tagged targets as separate Services. The section now uses tagged traffic targets and Istio weighted routing directly between those generated Services.

## Review Notes
The examples are intentionally generic and assume the referenced Knative Services, Istio gateway, DNS names, and revisions already exist. In a real cluster, custom VirtualServices should be checked carefully for host and gateway conflicts with Knative-managed routing resources.
