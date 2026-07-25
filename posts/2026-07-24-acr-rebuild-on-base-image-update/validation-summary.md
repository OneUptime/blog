# Validation Summary: Rebuilding Images Automatically When an ACR Base Image Changes

## Status

validated

## Post Type

Tutorial / implementation guide

## Technologies Covered

- Azure Container Registry (ACR)
- ACR Tasks and quick builds
- Azure CLI
- Docker and multi-stage Dockerfiles
- GitHub source triggers and personal access tokens
- Microsoft Entra managed identities
- Azure RBAC and ABAC repository permissions
- Container image tagging, digests, and release promotion

## Sources Consulted

- [About base image updates for ACR Tasks](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-base-images)
- [Automate container image builds and maintenance with ACR Tasks](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-overview)
- [Trigger a build when a base image changes in the same registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tutorial-base-image-update)
- [Trigger a build when a base image changes in another private registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tutorial-private-base-image-update)
- [Azure CLI reference for `az acr task`](https://learn.microsoft.com/en-us/cli/azure/acr/task?view=azure-cli-latest)
- [Azure CLI reference for `az acr build`](https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest#az-acr-build)
- [Azure CLI reference for `az role assignment create`](https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest#az-role-assignment-create)
- [Managed identities in ACR Tasks](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-authentication-managed-identity)
- [Azure ABAC repository permissions in ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [ACR Tasks YAML reference](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-reference-yaml)
- [Dedicated agent pools for ACR Tasks](https://learn.microsoft.com/en-us/azure/container-registry/tasks-agent-pools)
- [Azure Container Registry SKU features and limits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [`npm ci` reference](https://docs.npmjs.com/cli/v11/commands/npm-ci/)

## Issues Found

No technical issues found.

## Review Notes

- The current Azure CLI reference accepts `Runtime` and `All` for `--base-image-trigger-type` and explicitly documents `All` for dependencies in a multi-stage Dockerfile, matching the post. The ACR conceptual base-image page still says only runtime images are tracked, so Microsoft's documentation is internally inconsistent on this point.
- The current Azure CLI reference includes `--source-acr-auth-id` for ABAC-enabled task registries and quick builds. Older Azure CLI installations may not expose this option and should be upgraded before following those examples.
- All seven links in the post's Official Documentation section resolve to the intended Microsoft Learn references.
