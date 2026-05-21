# Validation Summary: How to Fix SSL Handshake Errors in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- Envoy sidecars
- Kubernetes Secrets and ConfigMaps
- TLS and mTLS
- Istio Gateway, ServiceEntry, DestinationRule, and PeerAuthentication resources
- istioctl and kubectl

## Sources Consulted
- Istio Secure Gateways: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Understanding TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Accessing External Services: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio Egress TLS Origination: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The introduction said Istio wraps all inter-service communication in encryption. I changed this to say Istio can encrypt inter-service communication when mTLS is enabled for the workloads involved, because PeerAuthentication and workload enrollment determine whether mTLS is accepted or required.
- Several networking resources used `networking.istio.io/v1beta1`. I updated the examples to `networking.istio.io/v1`, matching current Istio documentation.
- The root CA check referenced `istio-ca-secret` and `ca-cert.pem` as a general diagnostic. I changed the command to inspect the `istio-ca-root-cert` ConfigMap distributed to workloads and added a note that plugged-in CA installations should also inspect the `cacerts` secret.
- The post used `istioctl authn tls-check`, which is not present in the current Istio command reference. I replaced it with checks for PeerAuthentication resources and client proxy cluster TLS settings via `istioctl proxy-config cluster`.
- The external-service TLS section incorrectly described a ServiceEntry with protocol `HTTPS` as causing double encryption and paired application HTTPS with a DestinationRule `SIMPLE` TLS origination example. I corrected the text to distinguish HTTPS pass-through or SNI-based handling from TLS origination, and moved `mode: SIMPLE` to a port-level setting for plaintext HTTP redirected to target port 443.

## Review Notes
The commands are operational diagnostics and require a live cluster with the named pods, namespaces, and resources. Some jq paths over Envoy config output can vary by Istio and Envoy version, but the commands use documented `istioctl proxy-config` surfaces.
