# Validation Summary: How to Add Azure ACR as a Registry in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Azure Container Registry (ACR)
- Azure CLI
- Microsoft Entra service principals
- Docker
- Azure Kubernetes Service (AKS)

## Sources Consulted
- Portainer: Add a new registry - https://docs.portainer.io/admin/registries/add
- Portainer: Add an Azure registry - https://docs.portainer.io/admin/registries/add/azure
- Portainer: Add a custom registry - https://docs.portainer.io/admin/registries/add/custom
- Microsoft Learn: Azure Container Registry authentication with service principals - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal
- Microsoft Learn: Azure Container Registry authentication options - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Microsoft Learn: Troubleshoot ACR login, authentication, and authorization - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-troubleshoot-login-authn-authz
- Microsoft Learn: Integrate Azure Container Registry with Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/cluster-container-registry-integration
- Microsoft Learn: Azure CLI `az ad sp credential` - https://learn.microsoft.com/en-us/cli/azure/ad/sp/credential?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az acr credential` - https://learn.microsoft.com/en-us/cli/azure/acr/credential?view=azure-cli-lts
- Microsoft Learn: Azure CLI `az acr repository` - https://learn.microsoft.com/en-us/cli/azure/acr/repository?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az acr` - https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest
- Microsoft Learn: Geo-replication in Azure Container Registry - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication

## Issues Found
- The service principal creation example depended on `jq` even though `jq` was not listed as a prerequisite. I replaced it with Azure CLI `--query` usage and the documented `az ad sp list --display-name ... --query '[].appId' --output tsv` pattern from Microsoft Learn.
- The credential-rotation example reset the secret but did not capture the returned password in a way that could be reused for the Portainer update step. I updated it to store the new password in `NEW_SP_PASSWORD` and print it explicitly.
- The AKS managed identity section implied that `az aks update --attach-acr` handled Portainer's registry authentication directly. I clarified that it enables AKS workload pulls through the kubelet managed identity, while Portainer registry connectivity still uses admin or service principal credentials.
- The troubleshooting command for checking whether a service principal was expired used `az ad sp show --id $SP_ID`, which does not list credential metadata. I replaced it with `az ad sp credential list --id $SP_ID`.

## Review Notes
- Portainer's current documentation still includes a dedicated Azure registry provider, and the article's fallback to a custom registry remains technically valid because ACR supports standard registry authentication and Portainer supports custom registries.
- The `docker login --password` example matches Microsoft's ACR documentation. A future revision could prefer `--password-stdin` for better secret-handling hygiene, but the current command is still valid.
