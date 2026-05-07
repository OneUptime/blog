# Validation Summary: How to Add Azure ACR as a Registry in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Azure Container Registry (ACR)
- Azure CLI
- Docker
- Docker Compose
- Microsoft Entra service principals

## Sources Consulted
- Microsoft Learn, Authenticate with Azure Container Registry: https://learn.microsoft.com/en-gb/azure/container-registry/container-registry-authentication
- Microsoft Learn, Azure Container Registry authentication with service principals: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal
- Microsoft Learn, Azure CLI `az ad sp` reference: https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Microsoft Learn, Azure CLI `az acr credential` reference: https://learn.microsoft.com/en-us/cli/azure/acr/credential?view=azure-cli-latest
- Portainer Documentation, Add an Azure registry: https://docs.portainer.io/admin/registries/add/azure
- Portainer Documentation, Registries overview: https://docs.portainer.io/admin/registries
- Portainer Documentation, Docker host registries: https://docs.portainer.io/user/docker/host/registries
- Portainer Documentation, Docker swarm registries: https://docs.portainer.io/user/docker/swarm/registries
- Portainer Documentation, Kubernetes cluster registries: https://docs.portainer.io/user/kubernetes/cluster/registries
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The service principal example used `az ad sp show --id acr-service-principal` to retrieve the application ID. Microsoft’s ACR service-principal documentation uses `az ad sp list --display-name ... --query "[].appId"` for this flow. I updated the snippet to match the documented ACR pattern and introduced a `SERVICE_PRINCIPAL_NAME` variable so the example is internally consistent.
- The Portainer navigation was inaccurate. Current Portainer documentation says to add the registry from **Registries > Add registry**, not **Settings > Registries**, and to assign access from the environment-specific **Registries** view via **Manage access**, not from **Environments**. I corrected both instructions.
- The Compose example included a top-level `version: "3.8"` field. Docker’s current Compose documentation marks the top-level `version` element as obsolete, so I removed it.
- The post described ACR as a custom registry in Portainer. Portainer has a documented Azure registry provider, so I corrected the wording to reflect the supported integration more precisely.

## Review Notes
- For ACR registries configured with Azure ABAC repository permissions, Microsoft now documents newer repository-scoped roles such as `Container Registry Repository Reader`. The post’s example still uses the standard `AcrPull` role shown in Microsoft’s service-principal ACR guide, which remains valid for the common non-ABAC flow.
