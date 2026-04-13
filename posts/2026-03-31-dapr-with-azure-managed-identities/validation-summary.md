# Validation Summary: How to Use Dapr with Azure Managed Identities

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (component configuration for Azure services)
- Azure Managed Identities (system-assigned and user-assigned)
- Azure Kubernetes Service (AKS)
- Azure Container Apps
- Azure Key Vault (secret store)
- Azure Service Bus (pub/sub)
- Azure CLI (`az` commands)
- Azure RBAC role assignments

## Sources Consulted
- Azure AKS managed identity documentation: https://learn.microsoft.com/en-us/azure/aks/use-managed-identity
- Azure AKS pre-created kubelet managed identity: https://learn.microsoft.com/en-us/azure/aks/pre-created-kubelet-managed-identity
- `az aks nodepool` CLI reference: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- `az vmss identity assign` CLI reference: https://learn.microsoft.com/en-us/cli/azure/vmss/identity
- Dapr Azure Key Vault secret store component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/
- Dapr Azure Service Bus Topics pub/sub reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr managed identity authentication: https://docs.dapr.io/developing-applications/integrations/azure/azure-authentication/howto-mi/
- `az containerapp create` CLI reference: https://learn.microsoft.com/en-us/cli/azure/containerapp
- Azure Container Apps managed identity: https://learn.microsoft.com/en-us/azure/container-apps/managed-identity
- AAD Pod Identity deprecation notice: https://github.com/Azure/aad-pod-identity/issues/1349
- Migrate from pod identity to workload identity: https://learn.microsoft.com/en-us/azure/aks/workload-identity-migrate-from-pod-identity

## Issues Found

1. **Invalid CLI flag `--assign-pod-identity` on `az aks nodepool update`** (lines 92-96): The flag `--assign-pod-identity` does not exist on the `az aks nodepool update` command. The original command would fail. Replaced with a working approach that assigns the user-assigned identity to the underlying VMSS of the AKS node pool using `az vmss identity assign --identities`.

2. **Deprecated "AKS Pod Identity" mentioned as a current recommendation** (summary section): AAD Pod Identity was officially deprecated on October 24, 2022, and the AKS managed add-on support ended in September 2025. The summary previously said "combine user-assigned managed identities with AKS Pod Identity or workload identity federation" as if both were viable options. Removed the "AKS Pod Identity" reference, leaving only "workload identity federation" as the recommended approach.

## Review Notes
- The User-Assigned Managed Identity section uses a VMSS-level identity assignment, which makes the identity available to all pods on that node pool. For true per-pod identity isolation, workload identity federation (Microsoft Entra Workload Identity) is the recommended modern approach. A future revision could add a section specifically covering the workload identity federation setup with Dapr.
- The `identityProfile.kubeletidentity.objectId` query path was verified as correct for use with `az role assignment create --assignee`.
- The Dapr Key Vault component with only `vaultName` is correct and sufficient for system-assigned managed identity authentication.
- The Dapr Service Bus component correctly uses `namespaceName` with the full FQDN (`my-servicebus.servicebus.windows.net`).
- All `az containerapp create` flags (`--enable-dapr`, `--dapr-app-id`, `--dapr-app-port`, `--system-assigned`) were verified as valid.
