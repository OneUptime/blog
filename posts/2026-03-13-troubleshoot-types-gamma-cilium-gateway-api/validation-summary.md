# Validation Summary: How to Troubleshoot Types of GAMMA Configuration in the Cilium Gateway API

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Gateway API
- GAMMA
- HTTPRoute
- ReferenceGrant
- EndpointSlice
- kubectl

## Sources Consulted
- Cilium GAMMA Support: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gamma/
- Cilium Gateway API troubleshooting: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/troubleshooting/
- Cilium Operator documentation: https://docs.cilium.io/en/stable/internals/cilium_operator/
- Kubernetes Gateway API HTTPRoute documentation: https://gateway-api.sigs.k8s.io/api-types/httproute/
- Kubernetes Gateway API ReferenceGrant documentation: https://gateway-api.sigs.k8s.io/api-types/referencegrant/
- Kubernetes Gateway API specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Kubernetes Service documentation, Endpoints deprecation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post described Cilium consumer HTTPRoutes as cross-namespace routes that could be fixed with ReferenceGrant resources. Cilium currently supports only producer HTTPRoutes for GAMMA, so I changed the guidance to state that HTTPRoutes must be in the same namespace as the parent Service and that ReferenceGrant does not enable Cilium consumer route support.
- The post implied missing Service endpoints would make the HTTPRoute `ResolvedRefs` condition false. `ResolvedRefs` is for reference validity, not backend pod readiness, so I changed the text to inspect `Accepted` and `ResolvedRefs` for route/backend reference errors and to inspect EndpointSlices for ready endpoints.
- The post used the deprecated Kubernetes `Endpoints` API. Kubernetes v1.33 deprecates Endpoints in favor of EndpointSlice, so I replaced `kubectl get endpoints` with `kubectl get endpointslice -l kubernetes.io/service-name=<service-name>`.
- The architecture diagram showed a consumer HTTPRoute moving through a ReferenceGrant check and ending with an eBPF rule being loaded. I updated it to show Cilium's same-namespace producer-route requirement and Envoy configuration application.
- The operator log command used a label selector that may not match all Cilium installs. I replaced it with the Cilium-documented `kubectl logs -n kube-system deployments/cilium-operator` form.

## Review Notes
The post is now accurate for current Cilium GAMMA documentation. Future updates should re-check Cilium consumer route support because the Gateway API GAMMA workstream is still evolving.
