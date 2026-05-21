# Validation Summary: How to Set Up Egress Gateway with Mutual TLS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio Egress Gateway
- Istio ServiceEntry, Gateway, VirtualService, and DestinationRule resources
- Mutual TLS and TLS origination
- Kubernetes
- Kubernetes NetworkPolicy
- kubectl and istioctl

## Sources Consulted
- Istio official documentation: Egress Gateways with TLS Origination - https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway-tls-origination/
- Istio official documentation: Egress Gateways - https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio official reference: Gateway - https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio official reference: VirtualService - https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio official reference: DestinationRule - https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio official documentation: Understanding TLS Configuration - https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio official documentation: Install with istioctl - https://istio.io/latest/docs/setup/install/istioctl/
- Kubernetes official documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The original configuration mixed TLS-route passthrough semantics with a Gateway configured for `ISTIO_MUTUAL` termination. Istio's VirtualService reference applies `tls` routes to non-terminated TLS traffic, while the documented egress-gateway TLS-origination pattern uses HTTP routes with a Gateway protocol of `HTTPS` and `tls.mode: ISTIO_MUTUAL`. I changed the VirtualService from `tls` routing to `http` routing and updated the Gateway accordingly.
- The original flow showed the application sending HTTPS while also claiming the egress gateway initiated a new TLS connection to the external service. For TLS origination at the gateway, the application must send HTTP into the mesh; direct application HTTPS can be routed through a passthrough egress gateway, but the gateway cannot originate a fresh TLS connection without terminating the application's TLS. I changed the example request, traffic-flow diagram, and explanatory text to use HTTP from the application and TLS from the gateway to the external service.
- The ServiceEntry originally only declared port 443 as `TLS`, which matches HTTPS passthrough routing rather than TLS origination. I added HTTP port 80 and declared external HTTPS port 443 as `HTTPS`.
- The DestinationRule snippets originally applied TLS settings directly at the traffic policy level. I changed them to `portLevelSettings` for the relevant ports, matching the official Istio egress-gateway TLS-origination examples.
- The debugging tip mentioned conflicts on port 443 even though the corrected egress gateway listener uses port 80 for the sidecar-to-gateway leg. I updated it to port 80.
- The compliance explanation overclaimed that all outbound connections are encrypted in transit. I narrowed it to the mesh-to-gateway and gateway-to-external-service legs described by the configuration.

## Review Notes
The Kubernetes NetworkPolicy example is syntactically valid, but actual enforcement depends on a CNI plugin that implements NetworkPolicy. In production, the policy should usually be tailored to the exact DNS pods, gateway pods, namespaces, and CNI behavior rather than allowing every namespace broadly.
