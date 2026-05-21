# Validation Summary: How to Set Up Egress Gateway for Cloud API Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio Egress Gateway
- Istio ServiceEntry
- Istio Gateway
- Istio VirtualService
- Istio AuthorizationPolicy
- Kubernetes
- kubectl
- istioctl
- AWS S3 API endpoints
- Google Cloud API endpoints

## Sources Consulted
- Istio Egress Gateways: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio Accessing External Services: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio Egress Gateways with TLS Origination: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway-tls-origination/
- Istio TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/

## Issues Found
- The post described `REGISTRY_ONLY` as forcing traffic through the egress gateway. Updated the wording to match Istio behavior: `REGISTRY_ONLY` blocks unregistered external hosts, while routing through the gateway depends on the ServiceEntry and VirtualService configuration. Added a note that Kubernetes NetworkPolicy or equivalent firewall controls are needed to prevent pods from bypassing the sidecar or gateway entirely.
- The AWS VirtualService matched both `s3.amazonaws.com` and `s3.us-east-1.amazonaws.com` on the egress gateway leg but routed both to `s3.amazonaws.com`. Split the gateway-side TLS routes so each SNI host is forwarded to the matching external host.
- The GCP VirtualService matched both `storage.googleapis.com` and `www.googleapis.com` on the egress gateway leg but routed both to `storage.googleapis.com`. Split the gateway-side TLS routes so each SNI host is forwarded to the matching external host.
- The post said to create VirtualService and DestinationRule resources, but the shown passthrough examples only included VirtualService resources. Updated the wording to avoid claiming a DestinationRule was included in those examples.
- The TLS troubleshooting note implied that simply using `ISTIO_MUTUAL` on the Gateway is how the gateway handles TLS origination. Updated the note to point to Istio's egress gateway TLS origination pattern, where the Gateway, VirtualService, and DestinationRule must be configured consistently.

## Review Notes
The Istio resource API versions used in the examples are current. The examples use Istio's passthrough TLS pattern, so application workloads must initiate HTTPS connections to the cloud API endpoints. Access logging on the egress gateway may need to be enabled in the Istio mesh configuration before the log verification commands show useful request entries.
