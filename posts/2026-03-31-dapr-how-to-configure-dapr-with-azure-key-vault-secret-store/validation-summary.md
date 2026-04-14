# Validation Summary: How to Configure Dapr with Azure Key Vault Secret Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar, secret store API, component model, secret scoping)
- Azure Key Vault
- Azure CLI (`az keyvault`, `az aks`, `az group`)
- Azure Kubernetes Service (AKS) with Managed Identity
- Node.js with `@dapr/dapr` SDK
- Python with `dapr` SDK
- Dapr HTTP API
- PostgreSQL binding component (secret reference example)

## Sources Consulted
- Dapr Azure Key Vault secret store component reference — https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/
- Dapr Secrets API reference — https://docs.dapr.io/reference/api/secrets_api/
- Dapr secret scoping documentation — https://docs.dapr.io/operations/components/component-scopes/
- Dapr component secret references — https://docs.dapr.io/operations/components/component-secret/
- Dapr Node.js SDK documentation — https://docs.dapr.io/developing-applications/sdks/js/
- Dapr Python SDK documentation — https://docs.dapr.io/developing-applications/sdks/python/
- Azure CLI `az keyvault` reference — https://learn.microsoft.com/en-us/cli/azure/keyvault
- Azure CLI `az aks` reference — https://learn.microsoft.com/en-us/cli/azure/aks

## Issues Found
No technical issues found.

## Review Notes
- The "Grant Access to the Key Vault" section header says "AKS workload identity" but the command retrieves the kubelet managed identity (`identityProfile.kubeletidentity.objectId`), which is a cluster-level managed identity — not the newer AKS Workload Identity feature (which uses federated service account tokens). Both approaches are valid for granting Key Vault access, but the terminology is slightly imprecise. The kubelet identity approach shown is simpler and works well for scenarios where all pods in the cluster share the same Key Vault access. For per-pod identity isolation, AKS Workload Identity with user-assigned managed identities would be the more current recommendation.
- The `az keyvault set-policy` command uses the older access policy model. Azure now recommends Azure RBAC for Key Vault data plane access. The access policy approach still works but may be worth updating in a future revision.
- The Service Principal metadata snippet (lines 70-80) is shown as a partial YAML fragment rather than a complete component definition, which is intentional to avoid repetition but could be slightly confusing to beginners.
