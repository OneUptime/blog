# Validation Summary: How to Set Up TLS Passthrough in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway and VirtualService APIs
- Istio ingress gateway TLS passthrough
- Istio AUTO_PASSTHROUGH mode
- Istio protocol selection and mesh mTLS
- Kubernetes Deployment, Service, ConfigMap, and Secret mounts
- nginx TLS termination
- curl, OpenSSL, and kubectl troubleshooting commands

## Sources Consulted
- Istio Ingress Gateway without TLS Termination: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sni-passthrough/
- Istio Understanding TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Local CLI help for `curl --resolve` and `openssl s_client -connect/-servername`

## Issues Found
- The post said the Gateway protocol must be `TLS` rather than `HTTPS`. Istio's official examples and reference allow passthrough routes on unterminated `HTTPS` or `TLS` gateway ports, so I changed the wording to explain that `TLS` is valid for raw TLS and that `HTTPS` with `PASSTHROUGH` is also supported for HTTPS services.
- The AUTO_PASSTHROUGH explanation said the SNI encodes the destination cluster and service. Istio's reference describes the encoded destination details as service, subset, and port, so I corrected that wording.
- The sidecar injection section conflated protocol selection with disabling mesh mTLS. `appProtocol: tls` or a `tls-` port name tells Istio how to classify the traffic, but it does not disable Istio mTLS. I updated the section to distinguish protocol selection from PeerAuthentication/DestinationRule TLS policy.
- The troubleshooting note said `sniHosts` must exactly match Gateway hosts. Istio's VirtualService reference allows wildcard SNI prefixes and requires SNI values to fall within the VirtualService hosts, so I corrected the matching guidance.

## Review Notes
The Kubernetes and Istio resource shapes use current `networking.istio.io/v1` and Kubernetes APIs. `kubectl` was not installed in the local workspace, so kubectl command behavior was checked against the official Istio task examples rather than local `kubectl --help`.
