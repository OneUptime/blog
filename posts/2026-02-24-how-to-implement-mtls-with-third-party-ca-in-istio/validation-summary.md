# Validation Summary: How to Implement mTLS with Third-Party CA in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Istio mTLS and workload certificates
- Kubernetes
- cert-manager
- cert-manager istio-csr
- HashiCorp Vault PKI
- OpenSSL
- Helm

## Sources Consulted
- Istio official documentation: Plug in CA Certificates - https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio official documentation: Custom CA Integration using Kubernetes CSR - https://istio.io/latest/docs/tasks/security/cert-management/custom-ca-k8s/
- Istio official documentation: Security FAQ certificate lifetime - https://istio.io/latest/about/faq/security/
- cert-manager official documentation: Securing Istio Service Mesh - https://cert-manager.io/docs/usage/istio-csr/
- cert-manager official documentation: Installing istio-csr - https://cert-manager.io/docs/usage/istio-csr/installation/
- cert-manager official documentation: CA Issuer configuration - https://cert-manager.io/docs/configuration/ca/
- cert-manager official documentation: Vault issuer configuration - https://cert-manager.io/docs/configuration/vault/
- HashiCorp Vault official documentation: PKI secrets engine API - https://developer.hashicorp.com/vault/api-docs/secret/pki

## Issues Found
- The OpenSSL root CA example created a self-signed certificate without explicit CA basic constraints and key usage extensions. Added `basicConstraints`, `keyUsage`, and `subjectKeyIdentifier` extensions to make it a valid CA certificate for modern TLS validation.
- The intermediate CA signing command did not include a path length constraint or authority key identifier. Added `pathlen:0` and `authorityKeyIdentifier` to produce a cleaner intermediate CA certificate.
- The cert-manager ClusterIssuer example referenced `istio-ca-secret` but never created it. Added a `kubectl create secret tls` command and clarified that ClusterIssuer CA secrets live in cert-manager's cluster resource namespace.
- The istio-csr Helm install used outdated `app.certmanager.issuerRef.*` values and set `app.tls.rootCAFile` without mounting the file. Updated the command to current `app.certmanager.issuer.*` values and added the required root CA secret volume and mount.
- The istio-csr release name did not match the `caAddress` service name used later. Updated the release name to `cert-manager-istio-csr`.
- The IstioOperator example configured `caAddress` but did not disable istiod's built-in CA server. Added `ENABLE_CA_SERVER=false`, matching the official istio-csr installation guidance.
- The explanation said sidecars send CSRs to istiod, which forwards them to cert-manager via istio-csr. Corrected this to describe the Istio agent sending CSRs to istio-csr, which creates cert-manager CertificateRequests.
- The Vault role example constrained DNS domains but did not allow Istio SPIFFE URI SANs. Replaced the DNS-only constraint with `allowed_uri_sans="spiffe://*"` so Vault can sign Istio workload CSRs.
- The Vault istio-csr Helm update used outdated `issuerRef` values and the wrong release name. Updated it to current `app.certmanager.issuer.*` values and the same `cert-manager-istio-csr` release.
- The troubleshooting text claimed a typo in `cacerts` would make istiod fall back to a self-signed CA. Changed this to say invalid or missing keys can prevent istiod from loading the plugged-in CA.

## Review Notes
The post is technically valid after the corrections. The cert-manager and istio-csr commands remain example-oriented; in production, operators should pin chart and manifest versions instead of using `latest`, and should scope Vault PKI roles more tightly than `spiffe://*` where their trust domain and namespace policy are known.
