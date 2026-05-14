# Validation Summary: How to Configure Flux CD with Azure Container Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux OCIRepository
- Flux HelmRepository and HelmRelease
- Azure Kubernetes Service (AKS)
- Microsoft Entra Workload ID
- Azure Container Registry (ACR)
- Azure CLI
- Kubernetes Secrets and ServiceAccounts
- OCI artifacts

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux `push artifact` CLI documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux `tag artifact` CLI documentation: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Microsoft AKS Workload Identity deployment documentation: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft AKS Workload Identity overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Azure CLI `az identity federated-credential` reference: https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential
- Azure CLI `az acr scope-map` reference: https://learn.microsoft.com/en-us/cli/azure/acr/scope-map
- Azure CLI `az acr token credential` reference: https://learn.microsoft.com/en-us/cli/azure/acr/token/credential
- Azure Container Registry SKU features and limits: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus

## Issues Found
- The prerequisites listed only Standard or Premium ACR tiers. ACR's current SKU documentation shows Basic, Standard, and Premium support non-Microsoft Entra repository-scoped tokens and scope maps, so the prerequisite was corrected to include Basic.
- The Workload Identity ServiceAccount patch was incomplete for Flux source-controller. Flux's official Azure provider documentation patches both the `source-controller` ServiceAccount and the `source-controller` Deployment pod template with `azure.workload.identity/use: "true"`. The post now uses the Flux bootstrap `kustomization.yaml` patch format including both resources.
- The verification command comment said `az acr repository list` lists artifacts. The command lists repositories, so the comment was corrected.
- The HelmRepository verification comment implied status inspection. Flux OCI HelmRepository objects are data containers and do not report normal readiness/status like HTTP Helm repositories, so the wording was changed to check the object instead.

## Review Notes
- The OCIRepository, HelmRepository, HelmRelease, Kubernetes Secret, Azure CLI, and Flux CLI examples use current API fields and command flags according to the official documentation reviewed.
- Flux documents OCI HelmRepository as supported but in maintenance mode, with OCIRepository recommended for improved OCI Helm chart support. The existing post remains technically valid because it presents HelmRepository as an additional option.
