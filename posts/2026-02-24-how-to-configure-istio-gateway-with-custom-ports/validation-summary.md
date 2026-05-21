# Validation Summary: How to Configure Istio Gateway with Custom Ports

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- IstioOperator and istioctl
- Kubernetes Service, LoadBalancer, and NodePort networking
- Envoy ingress gateway listeners

## Sources Consulted
- Istio Ingress Gateways documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Protocol Selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio installation customization documentation: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl patch command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The port naming section said Gateway resource port names determine protocol handling. Istio Gateway servers use the explicit `protocol` field for that; Istio's port-name protocol selection applies to Kubernetes Service ports, and `appProtocol` takes precedence when present. Updated the wording to distinguish Service port naming from Gateway server protocol configuration.
- The testing section only showed the LoadBalancer `.ip` JSONPath. Istio's official ingress docs note that some environments expose a hostname instead. Added the hostname fallback command as a comment.

## Review Notes
The core two-layer requirement is correct: the ingress gateway Kubernetes Service must expose the external port, and the Istio Gateway must declare a matching server for traffic routing. The `IstioOperator` service port configuration, `Gateway` and `VirtualService` API versions, `kubectl patch` JSON patch form, NodePort range, and `istioctl proxy-config listener` usage are consistent with current official documentation.
