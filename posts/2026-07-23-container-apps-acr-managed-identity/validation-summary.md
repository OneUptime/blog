# Validation Summary: Letting Azure Container Apps Pull from ACR with Managed Identity

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Container Apps
- Azure Container Registry
- Microsoft Entra managed identities
- Azure RBAC and Azure ABAC
- Azure CLI
- Azure Private Link and private DNS

## Sources Consulted
- [Azure Container Apps image pull from Azure Container Registry with managed identity](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity-image-pull)
- [Managed identities in Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity)
- [Azure CLI: `az containerapp`](https://learn.microsoft.com/en-us/cli/azure/containerapp?view=azure-cli-latest)
- [Azure CLI: `az containerapp identity`](https://learn.microsoft.com/en-us/cli/azure/containerapp/identity?view=azure-cli-latest)
- [Azure CLI: `az containerapp registry`](https://learn.microsoft.com/en-us/cli/azure/containerapp/registry?view=azure-cli-latest)
- [Azure CLI: `az acr config authentication-as-arm`](https://learn.microsoft.com/en-us/cli/azure/acr/config/authentication-as-arm?view=azure-cli-latest)
- [Azure CLI: `az role assignment`](https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest)
- [Azure Container Registry Microsoft Entra permissions and role assignments overview](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Azure ABAC repository permissions in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [Azure Container Registry resource schema](https://learn.microsoft.com/en-us/rest/api/container-registry/registries/get?view=rest-container-registry-2025-11-01)
- [Connect privately to Azure Container Registry with Azure Private Link](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-endpoints)
- [Create an Azure Container Registry with Domain Name Label protection](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-get-started-portal)
- [Troubleshoot image pull failures in Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/troubleshoot-image-pull-failures)
- [Managed identity developer guidance](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview-for-developers)

## Issues Found
- The system-assigned identity section said to choose the role based on the registry permission mode but showed only the `Container Registry Repository Reader` command. That role is for ABAC-enabled registries and does not cover legacy RBAC mode. Added a separate `AcrPull` command for legacy registries so both documented paths are executable.
- The least-privilege checklist required the pull identity to have Reader without accounting for legacy registries. Changed it to require the pull-only role appropriate to the registry mode: `Container Registry Repository Reader` for ABAC-enabled mode or `AcrPull` for legacy mode.

## Review Notes
- The post correctly identifies `az acr config authentication-as-arm` and `az containerapp registry` as Preview command groups and appropriately recommends pinning and testing CLI versions.
- Current Azure CLI documentation supports the identity, registry, role-assignment, and container app flags used in the examples. Older CLI releases can lack newer flags such as `az role assignment list --assignee-object-id`.
- The role assignment mode values, DNL-protected login-server behavior, managed identity ID distinctions, private endpoint DNS requirements, and image pull policy claims match current Microsoft documentation.
