# Validation Summary: How to Route Traffic by Source Namespace in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio sidecar traffic routing
- Kubernetes namespaces
- kubectl
- istioctl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction said VirtualService source namespace routing was combined with AuthorizationPolicy for enforcement, but the post does not configure AuthorizationPolicy and routing is not access-control enforcement. Changed the wording to state that AuthorizationPolicy should be used separately when access control is required.
- The post described `sourceNamespace` as though it were a normal request-time match. Istio documents `sourceNamespace` as a selector that constrains which source workloads a rule applies to. Updated the wording in the explanation sections to reflect this selector behavior.
- The final retry example described the catch-all route as "Production traffic", but the route actually applies to all non-staging traffic. Changed this to "Non-staging traffic."

## Review Notes
The YAML examples use current Istio `networking.istio.io/v1` APIs and valid fields for `VirtualService`, `DestinationRule`, HTTP retries, HTTP fault injection, timeouts, and `exportTo`. The `kubectl` and `istioctl` commands use valid command forms. A future improvement would be to add an explicit AuthorizationPolicy example if the article wants to cover enforcement in addition to routing.
