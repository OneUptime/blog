# Validation Summary: How to Handle Certificate Management in Ambient Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ambient mode
- ztunnel
- Istio workload certificates and mTLS
- SPIFFE identities
- Kubernetes
- cert-manager and cert-manager istio-csr
- Kubernetes CertificateSigningRequest API
- IstioOperator configuration

## Sources Consulted
- Istio ambient data plane architecture: https://istio.io/latest/docs/ambient/architecture/data-plane/
- Istio ambient control plane architecture: https://istio.io/latest/docs/ambient/architecture/control-plane/
- Istio ztunnel troubleshooting and certificate inspection: https://istio.io/latest/docs/ambient/usage/troubleshoot-ztunnel/
- Istio istioctl command reference for `ztunnel-config certificates`: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio FAQ for workload certificate lifetime and `SECRET_TTL`: https://istio.io/latest/about/faq/
- Istio plug in CA certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio custom CA integration using Kubernetes CSR: https://istio.io/latest/docs/tasks/security/cert-management/custom-ca-k8s/
- IstioOperator options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- cert-manager istio-csr installation guide: https://cert-manager.io/docs/usage/istio-csr/installation/
- cert-manager Istio service mesh integration overview: https://cert-manager.io/docs/usage/istio-csr/

## Issues Found
- Corrected the description of `istioctl ztunnel-config certificates`. The command selects a ztunnel instance unless a specific ztunnel is provided; it does not list certificates from every ztunnel instance at once.
- Updated ztunnel-specific examples to pass the ztunnel pod as `<name>.istio-system`, matching the documented command form.
- Fixed invalid `IstioOperator` paths for pilot environment variables by moving them under `spec.values.pilot.env`.
- Replaced the rotation verification command with one that displays the certificate validity columns directly instead of grepping for unreliable text.
- Updated cert-manager installation from the old static manifest URL to the current official OCI Helm chart example.
- Updated the istio-csr installation command to use the official OCI chart form and added `app.server.caTrustedNodeAccounts=istio-system/ztunnel`, which is required for ambient node authentication.
- Added creation of the root CA secret used by the istio-csr chart values.
- Fixed the cert-manager CA configuration to place `ENABLE_CA_SERVER` under `spec.values.pilot.env`.
- Replaced the Kubernetes CSR API example with the current documented configuration pattern using `EXTERNAL_CA`, `ISTIO_META_CERT_SIGNER`, `CERT_SIGNER_DOMAIN`, and `PILOT_CERT_PROVIDER`.
- Corrected the ztunnel admin endpoint from port `15020` to `15000`.
- Replaced the `openssl s_client` workload-service example. In ambient mode, application traffic is not exposed as TLS directly on the workload service port; mTLS is handled by ztunnel/HBONE. The post now uses ztunnel logs to confirm source and destination identities.

## Review Notes
- The Kubernetes CSR API section still requires the operator to provide a real root certificate PEM and matching signer resources; that is expected for this integration and is consistent with the Istio task documentation.
