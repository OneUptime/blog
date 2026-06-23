# Validation Summary: How to Enable Mutual TLS (mTLS) in Istio

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Istio service mesh
- Istio mTLS and Auto mTLS
- Kubernetes
- Envoy sidecars
- SPIFFE workload identities
- Istio PeerAuthentication, DestinationRule, and AuthorizationPolicy resources
- Istio certificate management
- Prometheus alerting

## Sources Consulted
- Istio Security Concepts: https://istio.io/latest/docs/concepts/security/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio Mutual TLS Migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio TLS Configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio Plug in CA Certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/

## Issues Found
- Updated Istio prerequisites from obsolete Istio 1.18 / Kubernetes 1.22+ guidance to current supported-version guidance for Istio 1.30 and Kubernetes 1.32-1.36.
- Updated Istio CRD examples from `security.istio.io/v1beta1` and `networking.istio.io/v1beta1` to the current stable `v1` APIs.
- Clarified that `portLevelMtls` keys are workload/container ports, not Kubernetes Service ports.
- Corrected Auto mTLS wording so it describes client-side automatic mTLS behavior accurately.
- Replaced unsupported or misleading certificate rotation settings (`ISTIO_META_CERT_REFRESH_INTERVAL`, `WORKLOAD_CERT_TTL`, and `CITADEL_SELF_SIGNED_CA_GRACE_PERIOD_PERCENTILE`) with documented pilot-agent settings (`SECRET_TTL` and `SECRET_GRACE_PERIOD_RATIO`).
- Corrected custom CA comments so `ca-cert.pem` is described as the signing CA certificate and `cert-chain.pem` as the signing-to-root chain.
- Replaced `istioctl x authz check` and `istioctl authn tls-check` examples with documented `istioctl x describe pod` and `istioctl proxy-config endpoint` checks that are relevant to mTLS verification.
- Corrected the broad `host: "*.local"` DestinationRule example to target a concrete in-mesh service host and noted that Auto mTLS normally avoids the need for a mesh-wide DestinationRule.
- Corrected the Prometheus certificate expiration alert to use the documented `cert_expiry_seconds` metric.
- Added `mtls: STRICT` to the documented port-level exception example so the exception is explicit relative to a strict default.

## Review Notes
The post remains sidecar-mode focused. Istio ambient mode also supports mTLS, but adding ambient-specific coverage would be a content expansion rather than a correctness fix.
