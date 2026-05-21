# Validation Summary: How to Configure mTLS for Specific Namespaces in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio PeerAuthentication
- Istio mutual TLS
- Kubernetes namespaces
- Istio DestinationRule
- istioctl
- Prometheus metrics

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio debugging Envoy and Istiod guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ambient mode Layer 4 security policy guide: https://istio.io/latest/docs/ambient/usage/l4-policy/

## Issues Found
- Clarified that mesh-wide PeerAuthentication policies belong in the Istio root namespace, which is commonly `istio-system` but can differ by installation.
- Clarified that `PeerAuthentication` controls inbound mTLS requirements, while source-side outbound TLS is controlled by auto mTLS or an explicit `DestinationRule`.
- Clarified that `DISABLE` mode is a sidecar-mode setting and is not supported in ambient mode.
- Corrected the data-science example wording so it does not imply a PeerAuthentication policy disables sidecar injection.
- Updated `istioctl x describe pod` to the documented `istioctl experimental describe pod` form.
- Qualified the Prometheus monitoring note so strict namespaces are expected to show close to 100% mTLS for successful mesh traffic.

## Review Notes
The examples use current `security.istio.io/v1` and `networking.istio.io/v1` APIs. The post assumes sidecar mode for the `DISABLE` example; ambient-mode users should avoid `DISABLE` and rely on ambient's mTLS behavior.
