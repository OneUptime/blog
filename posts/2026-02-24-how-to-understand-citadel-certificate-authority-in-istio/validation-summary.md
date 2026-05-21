# Validation Summary: How to Understand Citadel (Certificate Authority) in Istio

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Istiod / Citadel certificate authority
- Kubernetes service accounts and secrets
- SPIFFE workload identities
- Envoy Secret Discovery Service (SDS)
- Mutual TLS (mTLS)
- cert-manager / Kubernetes CSR API integration
- Prometheus metrics

## Sources Consulted
- Istio Security Concepts: https://istio.io/latest/docs/concepts/security/
- Istio Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio Custom CA Integration using Kubernetes CSR: https://istio.io/latest/docs/tasks/security/cert-management/custom-ca-k8s/
- Istio Security FAQ: https://istio.io/latest/about/faq/security/
- Istio pilot-discovery command reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio Managing In-Mesh Certificates: https://istio.io/latest/docs/ops/configuration/traffic-management/manage-mesh-certificates/
- Istio security PKI CA package constants: https://pkg.go.dev/istio.io/istio/security/pkg/pki/ca

## Issues Found
- Corrected certificate delivery wording. Istio agent receives the signed certificate, and Envoy requests the certificate and key from the agent through SDS; the previous wording implied the agent directly configures Envoy.
- Tightened an mTLS wording overstatement so it says Istio can encrypt and authenticate service-to-service connections using workload identity, instead of implying every connection is always encrypted regardless of policy.
- Qualified root CA secret commands as applying to the default self-signed CA. For plugged-in CA deployments, Istio uses the `cacerts` secret instead.
- Clarified that the Kubernetes CSR custom CA integration example is experimental.
- Replaced `WORKLOAD_CERT_TTL` with the current istiod environment variable `DEFAULT_WORKLOAD_CERT_TTL`.
- Corrected the CSR signing error metric from `citadel_server_csr_sign_error_count` to `citadel_server_csr_sign_err_count`.
- Corrected the metric description from certificate chain expiry to root certificate expiry for `citadel_server_root_cert_expiry_timestamp`.
- Clarified troubleshooting and RBAC guidance so it covers both `istio-ca-secret` and `cacerts` depending on CA mode.

## Review Notes
The post remains a sidecar-focused explanation. Ambient mode also uses Istio workload identity and mTLS, but the post's sidecar-specific `pilot-agent` and Envoy SDS workflow is valid for sidecar-injected workloads.
