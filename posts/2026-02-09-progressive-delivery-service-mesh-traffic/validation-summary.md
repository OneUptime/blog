# Validation Summary: How to Integrate Progressive Delivery with Service Mesh Traffic Shifting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Argo Rollouts
- Istio
- Linkerd
- Flagger
- Gateway API HTTPRoute
- Horizontal Pod Autoscaler
- Prometheus / PromQL

## Sources Consulted
- Argo Rollouts Istio traffic management documentation: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/istio/
- Argo Rollouts traffic management and managed routes documentation: https://argo-rollouts.readthedocs.io/en/latest/features/traffic-management/
- Flagger Linkerd progressive delivery documentation: https://docs.flagger.app/main/tutorials/linkerd-progressive-delivery
- Flagger Gateway API progressive delivery documentation: https://docs.flagger.app/main/tutorials/gatewayapi-progressive-delivery
- Linkerd TrafficSplit documentation and deprecation notice: https://linkerd.io/docs/features/traffic-split/
- Linkerd HTTPRoute reference: https://linkerd.io/2/reference/httproute/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Argo Rollouts HPA support documentation: https://argoproj.github.io/argo-rollouts/features/hpa-support/

## Issues Found
- The Linkerd/Flagger section presented SMI `TrafficSplit` as the current generated routing resource. Linkerd's TrafficSplit and `linkerd-smi` support are now deprecated, so the section was updated to prefer the Gateway API provider and show an `HTTPRoute` with weighted `backendRefs`.
- The Flagger canary example did not include the Gateway API `service.gatewayRefs` needed for Flagger to attach the generated route to the Linkerd Service when using the Gateway API provider. Added the Service parent reference.
- The Argo Rollouts `setHeaderRoute` example omitted `trafficRouting.managedRoutes`, which Argo requires when it manages header-based routes and route precedence. Added `managedRoutes` with the `internal-users` route name.
- The Istio circuit breaking example used `outlierDetection.consecutiveErrors`, which is not the current DestinationRule field. Replaced it with `consecutive5xxErrors`, matching the current Istio API.

## Review Notes
The remaining snippets are syntactically valid YAML and match the documented API shapes. The HPA example depends on a custom metrics adapter exposing `istio_requests_per_second`; Kubernetes supports pod custom metrics with `autoscaling/v2`, but the metric is not built into Kubernetes or Istio by default.
