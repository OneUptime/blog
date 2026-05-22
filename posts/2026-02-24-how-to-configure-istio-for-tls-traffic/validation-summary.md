# Validation Summary: How to Configure Istio for TLS Traffic

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio Gateway TLS modes
- Istio VirtualService TLS routing
- Istio ServiceEntry and DestinationRule TLS origination
- Istio PeerAuthentication and mesh mTLS
- Kubernetes TLS and generic Secrets
- istioctl diagnostics

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Secure Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Ingress Gateway without TLS Termination task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sni-passthrough/
- Istio Understanding TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Egress TLS Origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl describe diagnostic guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Kubernetes kubectl create secret reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret/

## Issues Found
- The Gateway TLS modes section stated that Istio supports exactly four Gateway TLS modes. Istio also documents modes such as `ISTIO_MUTUAL` and `OPTIONAL_MUTUAL`, so the wording was changed to describe the listed values as four common modes.
- The `AUTO_PASSTHROUGH` description was incomplete. It now notes that destination details are encoded in SNI and that the mode is typically used for Istio mTLS connectivity across separate networks.
- The TLS origination example did not match the official Istio pattern for HTTP-to-HTTPS origination. The `ServiceEntry` now exposes logical HTTP port 80 with `targetPort: 443`, keeps HTTPS port 443 declared, and the `DestinationRule` now applies `tls.mode: SIMPLE` through `portLevelSettings` for port 80.
- The verification section used `istioctl authn tls-check`, which is not present in the current istioctl command reference. It was replaced with the documented `istioctl x describe pod` workflow for inspecting pod traffic and security configuration, and the follow-up proxy/log commands now reuse the resolved pod name.

## Review Notes
- The Istio networking examples still use `networking.istio.io/v1beta1`, which remains commonly supported, while current Istio documentation generally shows `networking.istio.io/v1`. A future modernization pass could update the examples to the GA API version consistently.
- `portLevelMtls` entries refer to workload/container ports, not Kubernetes Service ports; the post's example is valid if those numbers are the workload ports.
