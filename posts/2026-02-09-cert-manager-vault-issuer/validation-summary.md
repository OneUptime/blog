# Validation Summary: How to Configure cert-manager with HashiCorp Vault as a Certificate Issuer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- cert-manager Issuer, ClusterIssuer, and Certificate resources
- HashiCorp Vault PKI secrets engine
- HashiCorp Vault Kubernetes auth
- HashiCorp Vault AppRole and token auth
- TLS certificates and CA bundles

## Sources Consulted
- cert-manager Vault issuer documentation: https://cert-manager.io/docs/configuration/vault/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager annotations reference: https://cert-manager.io/docs/reference/annotations/
- HashiCorp Vault PKI secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/pki
- HashiCorp Vault PKI API documentation: https://developer.hashicorp.com/vault/api-docs/secret/pki
- HashiCorp Vault PKI tutorial: https://developer.hashicorp.com/vault/tutorials/pki/pki-engine
- HashiCorp Vault Kubernetes auth documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault AppRole documentation: https://developer.hashicorp.com/vault/docs/auth/approle

## Issues Found
- The Kubernetes auth example bound Vault access to the `cert-manager` service account in the `cert-manager` namespace while the namespaced Issuer was in the `default` namespace. I changed the example to create a dedicated `vault-issuer` service account in `default`, added the RBAC required for cert-manager to request a token for it, and bound the Vault Kubernetes auth role to that service account with the generated cert-manager audience.
- The Issuer examples used `serviceAccountRef.name: cert-manager`, which would not match the corrected Vault role binding. I updated those examples to use `vault-issuer`.
- The ClusterIssuer example incorrectly used `secretRef` as if it specified a service account namespace. I replaced it with `serviceAccountRef` and added a note that ClusterIssuer service account and RBAC resources must be created in cert-manager's cluster resource namespace.
- The CA bundle section implied `secretTemplate` causes cert-manager to include `ca.crt`. I corrected the explanation: cert-manager stores `ca.crt` when the issuer provides the CA, while `cert-manager.io/allow-direct-injection` allows cainjector to copy that CA data into supported resources.
- AppRole and token authentication examples created secrets in the `cert-manager` namespace even though the example Issuers were namespaced in `default`. I changed those secret creation commands to `-n default`.
- The AppRole issuer used `path: /v1/auth/approle`, but cert-manager's AppRole `path` field expects the auth mount name, such as `approle`. I corrected the field.
- The multiple ClusterIssuer examples omitted Kubernetes auth credentials. I added `serviceAccountRef` to both examples.
- The troubleshooting command attempted to authenticate from the cert-manager pod using the wrong service account token. I replaced it with a `kubectl create token vault-issuer` command and a Vault Kubernetes login check using that token.

## Review Notes
The Vault PKI role, root/intermediate CA setup, token auth, TLS `caBundle`, and certificate resource fields are otherwise aligned with current official documentation. The article still uses example domains and namespaces; real deployments should adjust Vault auth audiences, service account namespaces, and cluster resource namespace settings to match their cert-manager installation.
