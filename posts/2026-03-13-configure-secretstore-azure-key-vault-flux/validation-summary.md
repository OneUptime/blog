# Validation Summary: How to Configure SecretStore for Azure Key Vault with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- External Secrets Operator
- Azure Key Vault
- Azure Kubernetes Service
- Microsoft Entra Workload ID
- Azure CLI
- SOPS
- Sealed Secrets

## Sources Consulted
- External Secrets Operator Azure Key Vault provider documentation: https://external-secrets.io/latest/provider/azure-key-vault/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Microsoft Learn AKS Workload Identity deployment guide: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn AKS Workload Identity overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn Azure CLI `az identity federated-credential` reference: https://learn.microsoft.com/cli/azure/identity/federated-credential
- Microsoft Learn Azure CLI `az keyvault set-policy` reference: https://learn.microsoft.com/cli/azure/keyvault

## Issues Found
- The Workload Identity setup enabled OIDC and annotated a service account, but did not create the required federated identity credential linking the AKS OIDC issuer and Kubernetes service account subject to the user-assigned managed identity. Added `az aks show` and `az identity federated-credential create` commands.
- The service account example labeled a ServiceAccount with `azure.workload.identity/use: "true"` and described that as required for webhook mutation. Microsoft documents this label as a pod template label, while the ESO referenced-service-account pattern only requires the service account annotation and SecretStore reference. Removed the misleading label and renamed the step to create a workload identity service account.
- The namespaced `SecretStore` examples referenced credentials in the `external-secrets` namespace while the store itself was in `default`. Updated the workload identity service account and service principal Secret to `default` so the namespaced store and its referenced resources are aligned.
- The ESO snippets used `external-secrets.io/v1beta1`. Current ESO documentation uses `external-secrets.io/v1` for `SecretStore` and `ExternalSecret`, so the examples were updated to the current API version.
- The prerequisites and best practice text only described Key Vault access policies. ESO and Azure support both access-policy and Azure RBAC authorization models, so the wording now includes Azure RBAC and recommends a minimal role such as Key Vault Secrets User for RBAC-enabled vaults.

## Review Notes
The commands and manifests were reviewed against official documentation, but they were not executed against a live Azure subscription or Kubernetes cluster. The `az keyvault set-policy` command is correct for access policy-based Key Vaults; Azure RBAC-enabled vaults require role assignment instead.
