# Validation Summary: How to Route Traffic by Percentage Weight in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio weighted traffic routing
- Kubernetes service discovery
- kubectl
- istioctl
- Kiali
- Flagger

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Flagger Istio canary deployments documentation: https://docs.flagger.app/main/tutorials/istio-progressive-delivery

## Issues Found
- The post said VirtualService route weights "must add up to 100." Istio's VirtualService reference defines weights as relative proportions, where each destination receives `weight / sum(all weights)` requests. Updated the wording to say that totals of 100 are recommended for readable percentages rather than strictly required.
- The verification command used `curl` directly against the in-cluster service DNS name, which only works from a network path that can resolve and reach that service and would bypass Istio if run outside the mesh. Updated the example to execute curl from a meshed client pod using `kubectl exec`.
- The sidecar pitfall said weighted routing only works when both client and server pods have sidecars. Istio routing is applied by an Istio proxy, commonly the client sidecar for in-mesh calls or an ingress gateway for traffic entering the mesh. Updated the wording to focus on traffic passing through an Istio proxy.

## Review Notes
The Istio YAML examples use current `networking.istio.io/v1` APIs and valid fields for `VirtualService` HTTP routes, header matches, route weights, destinations, and `DestinationRule` subsets. The `kubectl apply` and `istioctl analyze -n default` commands are current. The Flagger Canary example uses the documented `flagger.app/v1beta1` API shape for Istio canary analysis, including `maxWeight`, `stepWeight`, and the `request-success-rate` metric.
