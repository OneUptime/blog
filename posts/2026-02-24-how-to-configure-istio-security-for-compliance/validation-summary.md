# Validation Summary: How to Configure Istio Security for Compliance (PCI DSS, HIPAA)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio PeerAuthentication, AuthorizationPolicy, RequestAuthentication, Telemetry, Gateway, and IstioOperator
- Kubernetes NetworkPolicy
- Prometheus alerting rules
- PCI DSS security controls
- HIPAA Security Rule technical safeguards
- kubectl resource export commands

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Envoy access logging task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Global Mesh Options reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Managing In-Mesh Certificates documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/manage-mesh-certificates/
- Istio certificate lifetime FAQ: https://istio.io/latest/about/faq/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- PCI Security Standards Council PCI DSS v4.0.1 publication note: https://blog.pcisecuritystandards.org/just-published-pci-dss-v4-0-1
- PCI Security Standards Council SAQ D for Merchants, PCI DSS v4.0 Requirement 4.2.1: https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Merchant.pdf
- HHS HIPAA Security Rule overview: https://www.hhs.gov/hipaa/for-professionals/security/index.html
- 45 CFR 164.312 technical safeguards: https://ecfr.io/Title-45/Section-164.312

## Issues Found
- The Requirement 2 IstioOperator snippet said `meshMTLS.minProtocolVersion` disables permissive mTLS. Changed the comment to say it requires at least TLS 1.2 for `ISTIO_MUTUAL` traffic, which matches Istio MeshConfig behavior.
- The gateway TLS text tied TLS 1.2 directly to PCI DSS 3.2.1. Updated it to reference current PCI DSS strong cryptography and secure protocol configuration language instead.
- The `AuthorizationPolicy` `AUDIT` example said it audits every request by itself. Updated the explanation to clarify that Istio marks matching requests for audit and requires a supporting audit-capable plugin or provider to emit audit records.
- The certificate management snippet only set `SECRET_TTL` and the self-signed CA RSA key size. Added `WORKLOAD_RSA_KEY_SIZE` for workload certificates and clarified the CA-specific comment.
- The export commands used ambiguous resource names such as `gateway`. Updated them to fully qualified resource names such as `gateways.networking.istio.io` to avoid conflicts with Kubernetes Gateway API resources.

## Review Notes
The examples are valid as illustrative Istio and Kubernetes configuration, but real compliance evidence still depends on cluster-specific enforcement, log retention, identity provider configuration, certificate lifecycle controls, and auditor-approved scope.
