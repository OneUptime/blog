# Validation Summary: How to Configure Egress Gateway with TLS Origination

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ServiceEntry
- Istio Gateway
- Istio VirtualService
- Istio DestinationRule
- Istio egress gateway
- TLS origination and mutual TLS
- Kubernetes kubectl
- istioctl proxy-config

## Sources Consulted
- Istio: Egress Gateways with TLS Origination: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway-tls-origination/
- Istio: Egress TLS Origination: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio: Egress Gateways: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio: DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio: VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio: Understanding TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/

## Issues Found
- The egress Gateway was configured as a plaintext HTTP listener while the article described the sidecar-to-gateway hop as using Istio mutual TLS. Updated the Gateway server to use `protocol: HTTPS` with `tls.mode: ISTIO_MUTUAL`, matching Istio's documented egress gateway TLS origination pattern.
- The ServiceEntry examples used `protocol: TLS` for port 443. Updated them to `protocol: HTTPS`, which matches Istio's TLS origination examples for HTTP traffic upgraded to HTTPS.
- The text said traffic is encrypted at every hop, even though the application sends plain HTTP to its local sidecar. Updated the wording to clarify that traffic is encrypted after it leaves the application pod and on the external hop.
- The text said `sni` is required. Istio can automatically set SNI for SIMPLE and MUTUAL TLS when it is not explicitly configured, so the wording was changed to say the explicit `sni` setting ensures the expected server name is sent.
- The egress gateway log command targeted the deployment without specifying the proxy container. Updated it to use Istio's documented label selector and `-c istio-proxy`.

## Review Notes
The mutual TLS origination example uses mounted certificate file paths, which are valid DestinationRule fields. Istio's current task documentation generally prefers `credentialName` with a Kubernetes Secret in the egress gateway namespace for gateway-based certificate handling, so that would be a useful future modernization.
