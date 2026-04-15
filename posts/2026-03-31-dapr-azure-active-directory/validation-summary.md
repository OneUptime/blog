# Validation Summary: How to Use Dapr with Azure Active Directory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Azure Active Directory (Microsoft Entra ID)
- Azure Service Bus
- Azure Kubernetes Service (AKS)
- Azure CLI
- Kubernetes

## Sources Consulted
- Dapr documentation: Azure AD authentication for Dapr components (https://docs.dapr.io/developing-applications/integrations/azure/azure-authentication/)
- Dapr documentation: Azure Service Bus Topics pub/sub component (https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/)
- Dapr documentation: Publish API reference (https://docs.dapr.io/reference/api/pubsub_api/)
- Dapr documentation: Secret references in components (https://docs.dapr.io/operations/components/component-secrets/)
- Azure CLI documentation: `az ad sp create-for-rbac` (https://learn.microsoft.com/en-us/cli/azure/ad/sp#az-ad-sp-create-for-rbac)
- Azure CLI documentation: `az aks update` (https://learn.microsoft.com/en-us/cli/azure/aks#az-aks-update)
- Azure RBAC built-in roles: Azure Service Bus Data Owner (https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles)

## Issues Found
1. **Managed identity component configuration used empty string instead of omitting the field**: The YAML for system-assigned managed identity set `azureClientId` to `""` with a comment "Empty = use pod's managed identity." Per Dapr's documentation, the correct approach is to omit the `azureClientId` field entirely for system-assigned managed identity. Setting it to an empty string is not the documented behavior and could cause unexpected results. Fixed by removing the `azureClientId` field and replacing it with comments explaining the correct approach for both system-assigned and user-assigned managed identities.

## Review Notes
- The `az aks update --enable-managed-identity` command is correct but readers should be aware this is a disruptive operation on existing clusters created with a service principal — it triggers node pool re-imaging.
- The post correctly notes that Azure Active Directory has been renamed to Microsoft Entra ID.
- The `--role contributor` used in the service principal creation grants broad permissions. While syntactically correct, a production deployment should use a more scoped role (e.g., "Azure Service Bus Data Owner") following least-privilege principles.
- The post covers kubelet managed identity, which works but the more modern approach for AKS is workload identity (Azure AD Workload Identity). This may be worth a future update.
