# Validation Summary: How to Configure mTLS with External Certificate Authority

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio mTLS and workload certificates
- External certificate authorities and PKI
- cert-manager
- cert-manager istio-csr
- HashiCorp Vault PKI
- Kubernetes Secrets and Issuers
- OpenSSL

## Sources Consulted
- Istio Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio istioctl command and environment variable reference: https://istio.io/latest/docs/reference/commands/istioctl/
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager istio-csr installation documentation: https://cert-manager.io/docs/usage/istio-csr/installation/
- cert-manager istio-csr usage documentation: https://cert-manager.io/docs/usage/istio-csr/
- cert-manager Issuer configuration documentation: https://cert-manager.io/docs/configuration/
- cert-manager Vault issuer documentation: https://cert-manager.io/docs/configuration/vault/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- HashiCorp Vault intermediate CA quick start: https://developer.hashicorp.com/vault/docs/secrets/pki/quick-start-intermediate-ca
- HashiCorp Vault PKI API documentation: https://developer.hashicorp.com/vault/api-docs/secret/pki

## Issues Found
- The plug-in CA introduction said Istio should receive a root certificate and signing key. Istio's `cacerts` secret expects the root certificate plus an intermediate CA certificate and private key, so the wording was corrected.
- The cert-manager install command used cert-manager `v1.14.0`, which is outdated. Updated the static manifest URL to the current documented `v1.20.2` release.
- The cert-manager example used `ClusterIssuer` resources while storing the CA secret in `istio-system`. cert-manager looks up secrets for `ClusterIssuer` in the cluster resource namespace by default, so the example was changed to namespaced `Issuer` resources in `istio-system`.
- The post suggested ACME as a suitable issuer for istio-csr. cert-manager's istio-csr documentation states ACME issuers cannot issue certificates with the arbitrary SAN values Istio requires, so the text was corrected.
- The istio-csr Helm install commands used the old chart repository form and installed into `istio-system` while the Istio `caAddress` example referenced a mismatched service name. Updated the commands to the current OCI chart form in the `cert-manager` namespace and changed `caAddress` accordingly.
- The Vault PKI role allowed DNS domains under `svc.cluster.local`, but Istio workload identities are SPIFFE URI SANs such as `spiffe://cluster.local/ns/default/sa/httpbin`. Updated the Vault role to allow the appropriate URI SAN pattern.
- The Vault cert-manager issuer example referenced a service account that would not be in the same namespace as the namespaced `Issuer`. Updated the example to reference a `vault-issuer` service account in `istio-system` and noted the Vault Kubernetes auth prerequisite.

## Review Notes
- cert-manager's istio-csr documentation recommends statically mounting and specifying the root CA for istio-csr to reduce signer-hijacking risk. The post remains technically usable without expanding into that full setup, but a future revision could add that hardening step.
