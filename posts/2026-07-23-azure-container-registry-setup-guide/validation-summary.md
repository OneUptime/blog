# Validation Summary: Azure Container Registry Setup: SKUs, Networking, and Your First Push

## Status

validated

## Post Type

Technical setup guide and command-line tutorial

## Technologies Covered

- Microsoft Azure
- Azure Container Registry
- Azure CLI
- Azure role-based access control (RBAC)
- Microsoft Entra attribute-based access control (ABAC)
- Docker
- Azure Private Link and private DNS

## Sources Consulted

- [Quickstart: Create an Azure Container Registry with the Azure CLI](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-get-started-azure-cli)
- [Azure CLI reference: `az acr`](https://learn.microsoft.com/en-us/cli/azure/acr)
- [Azure CLI reference: `az role assignment`](https://learn.microsoft.com/en-us/cli/azure/role/assignment)
- [Azure Container Registry SKU features and limits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Zone redundancy in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/zone-redundancy)
- [Azure Container Registry name availability REST API](https://learn.microsoft.com/en-us/rest/api/container-registry/registries/check-name-availability)
- [Azure Container Registry authentication options](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication)
- [Microsoft Entra ABAC repository permissions in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [Azure Container Registry permissions and role assignments overview](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Steps to assign an Azure role](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps)
- [Connect privately to Azure Container Registry using Azure Private Link](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-endpoints)
- [Configure firewall rules for Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-firewall-rules)
- [Check the health of an Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-check-health)
- [Best practices for Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-best-practices)
- [Docker CLI reference: `docker image rm`](https://docs.docker.com/reference/cli/docker/image/rm/)

## Issues Found

- The DNL explanation said that the hash prevents any different registry from reusing a deleted registry's hostname. This was too broad for reuse scopes such as `TenantReuse`, under which recreating the same registry name in the same tenant produces the same DNS label. The text now states that reuse is prevented outside the selected scope and explains the `TenantReuse` boundary.
- The role-assignment prerequisite named only `Owner` and `Role Based Access Control Administrator`. The actual requirement is the `Microsoft.Authorization/roleAssignments/write` permission, which is also included in `User Access Administrator` and can be granted through a custom role. The text now states the permission requirement and lists the relevant built-in roles.
- The pull-path test removed only the ACR tag, leaving the original MCR tag and its layers in Docker's local image store. Docker documents that removing one of multiple tags only removes that tag, so the following pull could reuse local layers and would not reliably test the registry's layer data endpoint. The test now removes both local tags before pulling from ACR and tells the reader to confirm the layer was downloaded or repeat the test in a clean Docker environment.

## Review Notes

- The documented `--dnl-scope` option remains marked Preview in the current Azure CLI reference. The post correctly advises pinning and testing the provisioning CLI version.
- The local Azure CLI available during review was version 2.71.0 and predates the documented `--dnl-scope` and `--role-assignment-mode` options. Current Microsoft documentation confirms both options in the latest CLI, so readers must use a current Azure CLI release.
- The post correctly distinguishes the registry resource name from a DNL-protected `loginServer`, ABAC-enabled repository roles from legacy `AcrPull`/`AcrPush` roles, data-plane authorization from the control-plane access needed by `az acr login`, and the registry endpoint from layer data endpoints.
- The corrected Docker pull, tag, push, image-removal, pull, and run commands use current Docker CLI syntax. The health-check command and the Premium-only Private Link, public IP network rule, dedicated data endpoint, and geo-replication claims are also current.
