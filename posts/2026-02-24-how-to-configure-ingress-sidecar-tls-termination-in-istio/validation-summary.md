# Validation Summary: How to Configure Ingress Sidecar TLS Termination in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar mode
- Istio Gateway, VirtualService, Sidecar, DestinationRule, PeerAuthentication, and EnvoyFilter resources
- Kubernetes Services, Deployments, and Secrets
- TLS termination, TLS passthrough, and Istio mTLS
- kubectl and istioctl commands

## Sources Consulted
- Istio Ingress Sidecar TLS Termination: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sidecar-tls-termination/
- Istio Ingress Gateway without TLS Termination: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sni-passthrough/
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/

## Issues Found
- The post described sidecar TLS termination but the main deployment example had the application terminate TLS directly. I replaced that with Istio's documented sidecar ingress TLS pattern: enabling `ENABLE_TLS_ON_SIDECAR_INGRESS`, mounting the TLS secret into `istio-proxy`, and configuring a `Sidecar` ingress listener with TLS settings.
- The post omitted the fact that sidecar ingress TLS termination is experimental and requires the Istio pilot feature flag. I added the required `istioctl install` setting.
- The post claimed the `tls-` port prefix prevents interception for protocol detection. I corrected this to say `https-` and `tls-` explicitly identify encrypted traffic, and sidecars treat it as encrypted data unless sidecar ingress TLS termination is configured.
- The PeerAuthentication example disabled mTLS for the entire selected workload. I changed it to keep workload mTLS strict while disabling Istio mTLS only on the externally exposed workload port, matching Istio's documented port-level behavior.
- The EnvoyFilter example attempted to use SDS with a Kubernetes TLS secret name, which is not the documented approach for arbitrary sidecar ingress TLS secrets. I changed the example to use certificate files mounted into `istio-proxy` and clarified that the supported `Sidecar` API should be preferred.
- The troubleshooting note said sidecar TLS secrets should be in `istio-system`. I corrected it to state that sidecar TLS secrets must be in the workload namespace and mounted into `istio-proxy`; gateway TLS secrets belong in the gateway workload's namespace.

## Review Notes
The `DestinationRule` sections are accurate for outbound TLS origination, but they are separate from ingress sidecar TLS termination. Future revisions could make that distinction more explicit with a complete end-to-end example using concrete namespaces, ports, and test workloads.
