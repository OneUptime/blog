# Validation Summary: How to Configure Different CAs per Namespace in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio certificate management
- Kubernetes CertificateSigningRequest API
- cert-manager Issuers, ClusterIssuers, and Certificates
- Istio ProxyConfig
- Istio AuthorizationPolicy
- Helm, kubectl, istioctl, jq, OpenSSL

## Sources Consulted
- Istio documentation: Custom CA Integration using Kubernetes CSR - https://istio.io/latest/docs/tasks/security/cert-management/custom-ca-k8s/
- Istio MeshConfig reference for `caCertificates` and `CertificateData` - https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio ProxyConfig reference - https://istio.io/latest/docs/reference/config/networking/proxy-config/
- cert-manager istio-csr documentation - https://cert-manager.io/docs/usage/istio-csr/
- cert-manager istio-csr installation documentation - https://cert-manager.io/docs/usage/istio-csr/installation/
- cert-manager Helm installation documentation - https://cert-manager.io/docs/installation/helm/
- cert-manager CA issuer documentation - https://cert-manager.io/docs/configuration/ca/
- cert-manager SelfSigned issuer documentation - https://cert-manager.io/docs/configuration/selfsigned/

## Issues Found
- The post incorrectly presented `cert-manager-istio-csr` with a single configured Issuer as the mechanism for per-namespace CAs. Updated the article to use Istio's documented Kubernetes CSR integration, where workloads can request different signer names and cert-manager signs those CSRs with matching ClusterIssuers.
- The IstioOperator example used `ENABLE_CA_SERVER: "false"` and `ISTIO_META_CERT_SIGNER` without the required Kubernetes CSR settings. Replaced it with `EXTERNAL_CA: ISTIOD_RA_KUBERNETES_API`, `caCertificates` signer mapping, `CERT_SIGNER_DOMAIN`, `PILOT_CERT_PROVIDER`, and signer approval RBAC.
- The per-namespace Issuer examples were not connected to the signer names used by Istio. Replaced them with ClusterIssuer-based examples that match Istio's documented signer format, plus namespace-level ProxyConfig resources that set `ISTIO_META_CERT_SIGNER`.
- The separate-root example used only `selfSigned` ClusterIssuers, which are not the CA issuers that sign workload CSRs. Updated the example to show CA ClusterIssuers backed by CA key-pair Secrets.
- The post described AuthorizationPolicy as PeerAuthentication-based isolation. Renamed the section and wording to match the actual resource shown.
- The selective trust example implied that MeshConfig trust anchors were specific to individual workloads. Updated the wording and YAML to use `certSigners`, which scopes trust anchors to signer names in Istio's MeshConfig.
- The final security explanation said tenants could not decrypt each other's traffic. Reworded this to the more accurate mTLS-layer authentication boundary.
- The monitoring example looked for CA Certificates in tenant namespaces after the corrected examples placed CA Certificates in the `cert-manager` namespace. Updated it to check the ClusterIssuer and CA Certificate in the correct locations.

## Review Notes
The Kubernetes CSR custom CA integration is documented by Istio as experimental. The examples assume the referenced CA key-pair Secrets and root CA PEM values are created and distributed consistently with the chosen PKI model.
