# Validation Summary: How to Configure Istio CA with HashiCorp Vault

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- HashiCorp Vault PKI secrets engine
- Vault Kubernetes auth
- cert-manager
- cert-manager istio-csr
- Kubernetes
- Helm

## Sources Consulted
- Istio official documentation: Plug in CA Certificates, https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- cert-manager official documentation: Installing istio-csr, https://cert-manager.io/docs/usage/istio-csr/installation/
- cert-manager official documentation: Securing Istio Service Mesh, https://cert-manager.io/docs/usage/istio-csr/
- cert-manager official documentation: Vault issuer configuration, https://cert-manager.io/v1.14-docs/configuration/vault/
- HashiCorp Vault official documentation: PKI secrets engine API, https://developer.hashicorp.com/vault/api-docs/secret/pki
- HashiCorp Vault official documentation: Kubernetes auth method, https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault official documentation: Kubernetes auth API, https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- Artifact Hub chart reference for cert-manager-istio-csr 0.16.0, https://artifacthub.io/packages/helm/cert-manager/cert-manager-istio-csr

## Issues Found
- The intermediate CA key export flow was incorrect. The post generated the intermediate CSR with Vault's `internal` key type, then generated a second `exported` intermediate key later. That second key would not match the signed intermediate certificate. I changed the CSR generation step to use `intermediate/generate/exported` once, then extract both the CSR and matching private key from the same Vault response.
- The Vault Kubernetes auth setup was incomplete for cert-manager's recommended secretless authentication. I added the service account and RBAC needed for cert-manager to create short-lived service account tokens, and bound the Vault Kubernetes auth role to that service account with the ClusterIssuer audience.
- The cert-manager install command pinned an old v1.14.0 manifest. I updated it to the current official Helm OCI install pattern and version shown in the current cert-manager istio-csr documentation.
- The istio-csr Helm command used outdated `app.certmanager.issuerRef.*` values. I updated it to the current `app.certmanager.issuer.*` chart values.
- The istio-csr command set `app.tls.rootCAFile` but did not mount a file at that path. I added creation of the root CA secret and the Helm volume and volumeMount values needed to make `/var/run/secrets/istio-csr/ca.pem` available.

## Review Notes
- The Vault PKI role uses `allow_any_name=true`, which is technically valid but broad. A production deployment should narrow Vault issuance policy to the mesh's actual DNS names and SPIFFE trust domain where possible.
- The Vault Kubernetes auth config shown assumes Vault can reach the in-cluster Kubernetes API address and can use local reviewer credentials if Vault runs inside the same cluster. External Vault deployments should set `token_reviewer_jwt` and `kubernetes_ca_cert` for the target cluster.
