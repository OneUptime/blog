# Validation Summary: How to Troubleshoot Azure Container Registry Image Pull Failures in AKS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Container Registry (ACR)
- Azure CLI
- Kubernetes image pull secrets and pod events
- Azure Private Link and Private DNS
- Docker and Node.js container images

## Sources Consulted
- Microsoft Learn: Troubleshoot AKS image pull errors from Azure Container Registry, https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/connectivity/cannot-pull-image-from-acr-to-aks-cluster
- Microsoft Learn: Azure CLI `az aks`, including `az aks check-acr` and `az aks update --attach-acr`, https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Azure CLI `az acr manifest list-metadata`, https://learn.microsoft.com/en-us/cli/azure/acr/manifest
- Microsoft Learn: Connect privately to an Azure container registry by using Azure Private Link, https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-link
- Microsoft Learn: Azure CLI private endpoint DNS zone groups, https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Microsoft Learn: Geo-replication in Azure Container Registry, https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication
- Microsoft Learn: Artifact Streaming on AKS, https://learn.microsoft.com/en-us/azure/aks/artifact-streaming
- Kubernetes documentation: `kubectl create secret docker-registry`, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes documentation: `kubectl debug`, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Node.js Release Working Group schedule, https://github.com/nodejs/Release
- npm documentation: `npm ci`, https://docs.npmjs.com/cli/v11/commands/npm-ci

## Issues Found
- The post said `az aks update --attach-acr` grants AcrPull without caveats. Microsoft documentation now distinguishes non-ABAC registries, which use AcrPull, from ABAC-enabled registries, which require Container Registry Repository Reader. Updated the explanation and manual role-assignment note.
- The post used `az acr repository show-manifests`, which is deprecated in favor of `az acr manifest list-metadata`. Replaced the command with the current Azure CLI command and changed the tag filter so it checks for the tag anywhere in the returned tag list.
- The Dockerfile example used `node:18`, which reached end of life on April 30, 2025. Updated the example to `node:24`.
- The Dockerfile installed production dependencies in the build stage before running `npm run build`, which can fail when build tooling is in dev dependencies. Updated it to install all dependencies in the build stage and install production dependencies with `npm ci --omit=dev` in the runtime stage.

## Review Notes
- The local environment did not have Azure CLI installed, so command validation was performed against official Microsoft Learn CLI references instead of local `az --help` output.
- Artifact Streaming is still documented as preview and has eligibility limits such as AKS and image architecture requirements. The post's brief mention is acceptable, but future revisions could include those limitations if the section is expanded.
