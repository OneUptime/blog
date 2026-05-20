# Validation Summary: How to Manage Secrets with ArgoCD and Azure Key Vault

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Azure Kubernetes Service
- Microsoft Entra Workload ID
- Azure Key Vault
- Azure CLI
- External Secrets Operator
- Kubernetes Secrets
- Kustomize

## Sources Consulted
- Microsoft Learn, AKS Workload Identity deployment guide: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn, `az identity federated-credential` CLI reference: https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential
- Microsoft Learn, `az keyvault set-policy` CLI reference: https://learn.microsoft.com/en-us/cli/azure/keyvault
- External Secrets Operator Azure Key Vault provider documentation: https://external-secrets.io/latest/provider/azure-key-vault/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- External Secrets Operator templating guide: https://external-secrets.io/v0.20.3/guides/templating/
- External Secrets Operator v0.17.0 release notes: https://newreleases.io/project/github/external-secrets/external-secrets/release/v0.17.0
- External Secrets Operator Helm chart listing: https://artifacthub.io/packages/helm/external-secrets-operator/external-secrets
- Argo CD Application specification documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/

## Issues Found
- The federated credential command used `--audience`, but the Azure CLI parameter is `--audiences`. Updated the command so it matches the documented `az identity federated-credential create` syntax.
- The External Secrets Operator examples used `external-secrets.io/v1beta1`, which is no longer served by current ESO releases. Updated the manifests to `external-secrets.io/v1`.
- The Argo CD Application installed ESO chart `0.10.0`, which is outdated and tied to the older beta API examples. Updated `targetRevision` to `2.4.1`, the current chart release available in Artifact Hub at review time.
- The certificate sync example attempted to read separate `cert` and `key` properties from a Key Vault object. ESO documents fetching the Key Vault certificate's backing PFX value as `secret/<cert-name>` and converting it with template functions. Updated the snippet to use `engineVersion: v2`, `b64dec`, `pkcs12cert`, and `pkcs12key`.

## Review Notes
The overall architecture and secret synchronization flow are technically sound: Argo CD can manage the ESO resources declaratively while ESO reads Azure Key Vault via Microsoft Entra Workload ID and writes Kubernetes Secrets. The certificate example assumes the Key Vault certificate has an exportable private key and is available through the certificate's backing secret; non-exportable certificates cannot produce a Kubernetes TLS secret with `tls.key`.
