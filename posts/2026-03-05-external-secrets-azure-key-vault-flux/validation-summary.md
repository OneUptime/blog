# Validation Summary: How to Configure External Secrets with Azure Key Vault in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- External Secrets Operator
- Kubernetes
- Azure Key Vault
- Azure Kubernetes Service
- Microsoft Entra Workload ID
- Azure CLI
- Helm

## Sources Consulted
- External Secrets Operator Azure Key Vault provider documentation: https://external-secrets.io/latest/provider/azure-key-vault/
- External Secrets Operator Azure Key Vault provider source: https://github.com/external-secrets/external-secrets/blob/main/providers/v1/azure/keyvault/keyvault.go
- External Secrets Operator Helm chart values: https://github.com/external-secrets/external-secrets/blob/main/deploy/charts/external-secrets/values.yaml
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Microsoft Learn, az identity federated-credential: https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential
- Microsoft Learn, AKS Workload Identity overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn, az keyvault set-policy: https://learn.microsoft.com/en-us/cli/azure/keyvault
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The `az identity federated-credential create` command used `--audience`. Current Azure CLI documentation lists the parameter as `--audiences`, with the default value `api://AzureADTokenExchange`. Updated the command to use `--audiences api://AzureADTokenExchange`.

## Review Notes
- The External Secrets Operator Azure Key Vault examples use the current `external-secrets.io/v1` API.
- The Flux `HelmRepository` and `HelmRelease` snippets use current API versions and valid fields.
- The Azure Key Vault provider supports JSON property extraction through `remoteRef.property`; the provider documentation also shows `dataFrom.extract` for extracting all JSON keys from a secret.
- The Key Vault access examples use access policies. For vaults configured with Azure RBAC authorization, equivalent Key Vault data-plane role assignments are required instead.
