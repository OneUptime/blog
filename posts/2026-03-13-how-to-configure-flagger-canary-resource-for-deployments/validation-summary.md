# Validation Summary: How to Configure Flagger Canary Resource for Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger Canary custom resources
- Kubernetes Deployments and Services
- Kubernetes HorizontalPodAutoscaler
- Istio traffic routing
- kubectl

## Sources Consulted
- Flagger official documentation: Introduction, https://docs.flagger.app/main
- Flagger official documentation: How it works, https://docs.flagger.app/usage/how-it-works
- Flagger official documentation: Istio Canary Deployments, https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Flagger official documentation: NGINX Canary Deployments, https://docs.flagger.app/tutorials/nginx-progressive-delivery
- Kubernetes official documentation: kubectl set image, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/

## Issues Found
- The Istio gateway example used `public-gateway.istio-system.svc.cluster.local`. Flagger's Istio examples reference Gateway resources as `namespace/name`, so this was changed to `istio-system/public-gateway`.
- The service explanation listed only `podinfo-primary` and `podinfo-canary`. Flagger also creates or manages the apex service named `podinfo`, which routes to the primary workload by default, so the list was updated.
- The HPA explanation said Flagger scales the canary HPA during analysis. Flagger creates a primary HPA copy and pauses traffic increases while the target or primary workloads are scaling, so the wording was corrected.

## Review Notes
The examples use current Kubernetes APIs for the covered resources (`apps/v1`, `autoscaling/v2`, `networking.k8s.io/v1` where discussed in references). The post remains provider-sensitive: Istio-specific `gateways` and `hosts` fields should be adjusted for other Flagger providers such as NGINX, Linkerd, or Gateway API.
