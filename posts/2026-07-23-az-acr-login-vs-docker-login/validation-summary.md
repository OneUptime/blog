# Validation Summary: az acr login vs. docker login: Why One Works When the Other Returns 401

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure CLI
- Azure Container Registry (ACR)
- Microsoft Entra ID
- Azure RBAC and ABAC repository permissions
- Docker CLI, Docker Engine, and Docker credential stores
- OCI registry authentication
- Bash and curl

## Sources Consulted
- [Azure CLI reference: `az acr login`, `az acr show`, `az acr show-endpoints`, and `az acr check-health`](https://learn.microsoft.com/en-us/cli/azure/acr)
- [Azure Container Registry authentication options](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication)
- [Troubleshoot ACR login, authentication, and authorization](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-troubleshoot-login-authn-authz)
- [Troubleshoot Azure Container Registry authentication issues](https://learn.microsoft.com/en-us/troubleshoot/azure/azure-container-registry/acr-authentication-errors)
- [Azure Container Registry authentication with service principals](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal)
- [Microsoft Entra permissions and role assignments for ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Azure ABAC repository permissions in ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [ACR geo-replication and regional endpoints](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication)
- [ACR Domain Name Label protection](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-get-started-portal#configure-domain-name-label-dnl-option)
- [Non-Microsoft Entra token-based repository permissions](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-token-based-repository-permissions)
- [Docker CLI reference: `docker login`](https://docs.docker.com/reference/cli/docker/login/)
- [Microsoft ACR reachability guidance for an unauthenticated `/v2/` request](https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/connectivity/cannot-pull-image-from-acr-to-aks-cluster)

## Issues Found
No technical issues found.

## Review Notes
- All Bash snippets passed a syntax check.
- The documented Azure CLI flags and commands are current. Regional endpoints and `az acr login --endpoint` remain Preview features and require Azure CLI 2.86.0 or later, as the post states.
- The post correctly distinguishes authentication from repository authorization, including the separate control-plane and data-plane roles for ABAC-enabled registries.
- The service principal, scope-map token, admin account, and exposed-token credential formats match the official ACR guidance.
- All external links in the post resolved successfully at review time.
