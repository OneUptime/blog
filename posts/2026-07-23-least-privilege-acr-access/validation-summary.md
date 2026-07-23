# Validation Summary: Least-Privilege ACR Access: Roles, Repository Permissions, and Scope Maps

## Status
validated

## Post Type
Technical security guide

## Technologies Covered
- Azure Container Registry (ACR)
- Azure role-based access control (RBAC)
- Microsoft Entra attribute-based access control (ABAC)
- Azure built-in roles for ACR
- ACR scope maps and non-Microsoft Entra tokens
- Azure CLI
- Docker registry authentication
- Managed identities and service principals
- ACR Tasks, Quick Tasks, Quick Builds, and Quick Runs

## Sources Consulted
- [Azure Container Registry Microsoft Entra permissions and role assignments overview](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Azure ABAC repository permissions in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [Azure Container Registry roles directory reference](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-directory-reference)
- [Azure built-in roles for Containers](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/containers)
- [Azure Container Registry custom roles](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-custom-roles)
- [Non-Microsoft Entra token-based repository permissions](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-token-based-repository-permissions)
- [Azure Container Registry authentication options](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication)
- [Azure CLI reference: `az acr`](https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest)
- [Azure CLI reference: `az acr scope-map`](https://learn.microsoft.com/en-us/cli/azure/acr/scope-map?view=azure-cli-latest)
- [Azure CLI reference: `az acr token`](https://learn.microsoft.com/en-us/cli/azure/acr/token?view=azure-cli-latest)
- [Azure CLI reference: `az acr token credential`](https://learn.microsoft.com/en-us/cli/azure/acr/token/credential?view=azure-cli-latest)
- [Azure CLI reference: `az role assignment`](https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest)
- [Assign Azure roles using Azure CLI](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli)
- [Azure Container Registry REST API role-assignment mode values](https://learn.microsoft.com/en-us/rest/api/container-registry/registries/list-by-resource-group?view=rest-container-registry-2025-11-01)

## Issues Found
- The token description said every ACR token has one or two generated passwords. A token created with `--no-passwords` has no password until a credential is generated. Changed the description to state that a token can have zero, one, or two generated passwords.
- The migration mapping listed `AcrPush` to Repository Writer without noting the loss of catalog access. Legacy `AcrPush` includes repository catalog listing, while `Container Registry Repository Writer` explicitly excludes it. Added guidance to assign Catalog Lister when an `AcrPush` identity depends on catalog access.

## Review Notes
- All Bash code fences pass `bash -n`.
- The Azure CLI command groups, flags, condition syntax, role-assignment mode values, role names, and JMESPath queries match the current official references.
- The `--role-assignment-mode` option is a relatively recent Azure CLI capability and is absent from some older CLI releases. Readers should use a current Azure CLI version as recommended by the ABAC documentation.
- The post correctly distinguishes registry control-plane permissions from repository data-plane permissions and correctly warns that legacy ACR roles are not honored for repository access after switching to ABAC-enabled mode.
