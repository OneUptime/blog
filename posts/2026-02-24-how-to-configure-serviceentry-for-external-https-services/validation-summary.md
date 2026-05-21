# Validation Summary: How to Configure ServiceEntry for External HTTPS Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ServiceEntry
- Istio DestinationRule
- Istio VirtualService concepts
- Kubernetes Secrets
- Envoy sidecar proxying
- HTTPS, TLS, SNI, and mutual TLS
- Istio telemetry metrics

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Egress TLS Origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio Accessing External Services task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio Protocol Selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- Corrected the explanation of `protocol: HTTPS` for sidecars. Istio's protocol selection documentation states that sidecars do not decrypt HTTPS traffic and that `https` behaves the same as `tls` for sidecar purposes, so the post now avoids implying HTTP-level visibility in passthrough mode.
- Corrected the TLS origination example. The previous example routed HTTP traffic to service port 443 with a VirtualService and configured TLS origination on port 443. Istio's documented sidecar TLS origination pattern uses `targetPort: 443` on the ServiceEntry's HTTP port and applies `tls.mode: SIMPLE` to service port 80 in the DestinationRule. The README now follows that pattern.
- Corrected the external mTLS example. The previous example created a Kubernetes secret in `istio-system` and referenced certificate file paths that would not be mounted into application sidecars by that command. The README now uses the documented `credentialName` pattern with a `workloadSelector`, standard secret keys, and a ServiceEntry HTTP port with `targetPort: 443` for mTLS origination.

## Review Notes
The post is technically relevant and the remaining snippets use current `networking.istio.io/v1` APIs. The mTLS example assumes the client workload has the label `app: payment-service` and that the secret is created in the same namespace as that workload.
