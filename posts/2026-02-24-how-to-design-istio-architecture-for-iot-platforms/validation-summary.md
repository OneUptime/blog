# Validation Summary: How to Design Istio Architecture for IoT Platforms

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Kubernetes namespaces and labels
- Istio Gateway and VirtualService traffic routing
- Istio DestinationRule connection pools and outlier detection
- Istio Sidecar configuration scoping
- IstioOperator control plane sizing
- Istio RequestAuthentication and AuthorizationPolicy
- MQTT, HTTP, gRPC, TLS, and TCP traffic patterns

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio protocol selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- IstioOperator options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio MeshConfig ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio pilot-discovery command reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Kubernetes kubectl create namespace reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The MQTT VirtualService example used a `tls` route even though the Gateway was configured with `tls.mode: SIMPLE`, which terminates TLS at the gateway. Istio `tls` routes are for unterminated TLS passthrough traffic. Changed the MQTT route to `tcp` with a port match so the raw MQTT stream is routed correctly after gateway TLS termination.
- The JWT security example said authentication was configured at ingress, but the `RequestAuthentication` and `AuthorizationPolicy` selected `app: telemetry-ingestor` in the application namespace. Changed both policies to the `istio-system` namespace and selected `istio: ingressgateway`, matching the stated ingress-gateway enforcement pattern.

## Review Notes
- The examples use Istio `networking.istio.io/v1beta1` APIs, which are still commonly served by Istio installations, while the current Istio reference examples use `networking.istio.io/v1`. A future refresh could align snippets with `v1` for consistency with current documentation.
- Local `kubectl` was not installed in the review environment, so Kubernetes command validation was performed against the official generated kubectl documentation.
