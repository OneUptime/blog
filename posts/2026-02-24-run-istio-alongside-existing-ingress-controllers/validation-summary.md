# Validation Summary: How to Run Istio Alongside Existing Ingress Controllers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Kubernetes Ingress and IngressClass
- Istio Gateway and VirtualService
- Istio AuthorizationPolicy and mTLS
- NGINX Ingress Controller
- DNS and LoadBalancer migration patterns

## Sources Consulted
- Istio installation and gateway setup documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio install customization documentation: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio secure ingress task documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Ingress-NGINX monitoring documentation: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/

## Issues Found
- Clarified that Istio's control plane watches Istio `Gateway` and `VirtualService` resources and programs the ingress gateway, rather than implying the gateway workload itself watches those resources.
- Changed the custom gateway installation wording from creating an `IstioOperator` resource to using an IstioOperator configuration with `istioctl install -f`, matching Istio installation guidance.
- Added the requirement that the TLS secret referenced by `credentialName` must exist in the gateway workload namespace.
- Changed the VirtualService destination host to the fully qualified service DNS name to avoid namespace ambiguity, as recommended by Istio documentation.
- Replaced the deprecated `kubernetes.io/ingress.class` annotation example with `spec.ingressClassName`.
- Corrected the sidecar and policy guidance: default sidecar mode accepts plaintext and mTLS, and namespace-based AuthorizationPolicy source matching requires mTLS identity. The policy example now includes a workload selector so it does not apply to every workload in the namespace.
- Updated the Gateway patch command to target `gateways.networking.istio.io` and preserve both HTTP and HTTPS server entries. The previous JSON merge patch replaced the full `servers` list with only HTTP.
- Updated the Istio metrics command to specify the `istio-proxy` container and replaced the NGINX metrics example with the documented port-forward-to-10254 approach.

## Review Notes
- The post remains version-neutral and uses current stable Kubernetes and Istio API versions.
- The example assumes the default Istio ingress gateway remains in `istio-system`; installations using the newer separate gateway namespace pattern need to place TLS secrets and `Gateway` resources accordingly.
