# Validation Summary: How to Handle Services Without Selectors in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services
- Kubernetes EndpointSlices
- Istio service discovery
- Istio DestinationRule
- Istio VirtualService
- Istio AuthorizationPolicy
- Istio Sidecar
- Istio ServiceEntry
- Istio telemetry metrics

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/#services-without-selectors
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/#istioctl-proxy-config-endpoint
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- The post used the legacy Kubernetes `Endpoints` API as the primary approach for selector-less services. Current Kubernetes documentation recommends manually creating `EndpointSlice` resources for selector-less services, and the `Endpoints` API is deprecated. I changed the examples and dynamic update script to use `discovery.k8s.io/v1` `EndpointSlice` resources with the required `kubernetes.io/service-name` label and a `endpointslice.kubernetes.io/managed-by` label.
- The authorization section implied source-side access control could be handled by an Istio `Sidecar` resource. Istio documents Sidecar egress hosts as service visibility and configuration scoping, and notes that outbound traffic policy is not an outbound firewall. I clarified that this limits exposed egress hosts for selected workloads but is not a replacement for a firewall or authorization enforced by the external service.

## Review Notes
The remaining Istio examples use current `networking.istio.io/v1` and `security.istio.io/v1` APIs. The YAML snippets parse successfully, and the `istioctl proxy-config endpoint`, DestinationRule, VirtualService, ServiceEntry, Sidecar, and metric names match the current Istio references.
