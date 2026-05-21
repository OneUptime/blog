# Validation Summary: How to Debug Why Fault Injection is Not Working

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio VirtualService
- Istio HTTP fault injection
- Istio sidecar proxies
- Istio Gateway and mesh routing
- Istio Sidecar resource
- Kubernetes services and DNS names
- kubectl
- istioctl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio fault injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio traffic management best practices: https://istio.io/latest/docs/ops/best-practices/traffic-management/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes kubectl JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The VirtualService examples used `networking.istio.io/v1beta1`. Current Istio documentation uses `networking.istio.io/v1` for VirtualService examples, so the post was updated to use the current stable API version.
- The host-matching explanation implied that a short service name always maps cleanly to the fully qualified service name. Istio resolves short names based on the VirtualService namespace, and Kubernetes short service names are namespace-sensitive, so the wording was narrowed to same-namespace calls and now recommends fully qualified service names in production.
- The conflicting VirtualServices section stated that Istio merges multiple VirtualServices for the same host without qualification. Istio documents that host merging is not supported for sidecars and only applies to gateway-bound VirtualServices with caveats, so the section was corrected.

## Review Notes
The remaining commands and snippets are technically consistent with the current Istio and Kubernetes documentation. The route-inspection Python snippet depends on Envoy route dump structure and may need adjustment for unusual Istio/Envoy versions, but the troubleshooting approach is valid.
