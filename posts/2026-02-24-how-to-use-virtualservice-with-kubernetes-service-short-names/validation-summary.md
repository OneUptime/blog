# Validation Summary: How to Use VirtualService with Kubernetes Service Short Names

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio VirtualService
- Istio Destination routing
- Istio configuration scoping and exportTo
- Kubernetes Services
- Kubernetes DNS service discovery
- istioctl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio configuration scoping documentation: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Istio v1 APIs announcement and supported API versions: https://istio.io/latest/blog/2024/v1-apis/

## Issues Found
- Updated VirtualService examples from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API version. Istio still supports `v1beta1`, but the official reference now uses `v1` for these resources.
- Corrected the visibility warning for cross-namespace routing. The original text referred to `exportTo` settings on the target namespace; Istio visibility scoping is configured through `spec.exportTo` on Istio resources such as VirtualService, DestinationRule, and ServiceEntry, or through the `networking.istio.io/exportTo` annotation on Kubernetes Services.

## Review Notes
- The core claim is correct: Istio interprets short service names in VirtualService hosts and destination hosts relative to the namespace of the rule, not the service namespace.
- Kubernetes DNS examples are consistent with the official service DNS behavior for same-namespace short names, namespace-qualified names, and full service FQDNs.
- The `istioctl proxy-config clusters`, `istioctl proxy-config endpoints --cluster`, and `istioctl analyze --all-namespaces` commands match current Istio CLI documentation.
