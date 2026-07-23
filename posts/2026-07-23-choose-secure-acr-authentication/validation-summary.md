# Validation Summary: Managed Identity, Service Principal, or Admin User? Choosing Secure ACR Authentication

## Status
validated

## Post Type
Security guide and authentication decision guide

## Technologies Covered
- Microsoft Azure
- Azure Container Registry (ACR)
- Microsoft Entra ID
- Azure managed identities
- Microsoft Entra service principals and workload identity federation
- Azure RBAC and ABAC repository permissions
- Azure CLI
- Docker CLI

## Sources Consulted
- [Authenticate with Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication)
- [Use a managed identity to authenticate to an Azure container registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication-managed-identity)
- [Sign into Azure with a managed identity using Azure CLI](https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-managed-identity?view=azure-cli-latest)
- [Azure Container Registry authentication with service principals](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal)
- [Azure Container Registry Microsoft Entra permissions and role assignments overview](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Azure ABAC repository permissions in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [Azure Container Registry REST API: Registries - Get](https://learn.microsoft.com/en-us/rest/api/container-registry/registries/get?view=rest-container-registry-2025-11-01)
- [Azure CLI: az acr](https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest)
- [Azure CLI: az role assignment](https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest)
- [Non-Microsoft Entra token-based repository permissions in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-token-based-repository-permissions)
- [What are managed identities for Azure resources?](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview)
- [Check the health of an Azure container registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-check-health)
- [Docker CLI: docker login](https://docs.docker.com/reference/cli/docker/login/)

## Issues Found
- The managed-identity diagnostic example created and referred to a user-assigned managed identity but used `az login --identity`, which signs in with a system-assigned managed identity. Changed the command to `az login --identity --object-id "$IDENTITY_PRINCIPAL_ID"` so Azure CLI selects the user-assigned identity whose object/principal ID the example already retrieved.

## Review Notes
- The role-assignment-mode output values, ABAC and legacy role mappings, separation of CLI-login control-plane permission from repository data-plane roles, three-hour registry token lifetime, admin-user behavior, service-principal Docker credentials, and diagnostic commands match the current official documentation.
- The ABAC-related CLI options and newer ACR role model require a current Azure CLI release.
