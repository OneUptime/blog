# Validation Summary: How to Implement Service-to-Service Authentication with Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecars
- Mutual TLS (mTLS)
- SPIFFE workload identities
- PeerAuthentication
- AuthorizationPolicy
- IstioOperator mesh configuration
- Prometheus metrics

## Sources Consulted
- Istio Security concepts: https://istio.io/latest/docs/concepts/security/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio Security FAQ: https://istio.io/latest/about/faq/security/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio observability concepts: https://istio.io/latest/docs/concepts/observability/

## Issues Found
- Updated Istio security resources from `security.istio.io/v1beta1` to the current `security.istio.io/v1` API used in official Istio 1.30 documentation.
- Clarified that `portLevelMtls` uses the workload/container port, not the Kubernetes Service port, and that the port must be bound by a Service for the setting to apply.
- Replaced the obsolete `istioctl authn tls-check` command with the current `istioctl proxy-config rootca-compare` command from the official `istioctl` reference.
- Corrected the description of `istioctl x describe pod` so it describes pod configuration inspection rather than directly proving service-to-service mTLS.
- Fixed the monitoring section to match the Prometheus query shown: `istio_requests_total` with `connection_security_policy` is for HTTP request metrics, not `istio_tcp_connections_closed_total`.

## Review Notes
- `istioctl x describe pod`, `istioctl x authz check`, and `istioctl proxy-config rootca-compare` are current commands, but the Istio docs mark the relevant `experimental` command group and `rootca-compare` as under active development.
- The post is written for sidecar-based Istio examples. Ambient mode has different operational commands and does not support `DISABLE` mTLS in PeerAuthentication.
