# Validation Summary: How to Configure Flux OCI Secret with Azure ACR Token

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Source Controller
- Flux OCIRepository and HelmRepository APIs
- Kubernetes ServiceAccounts and Secrets
- Azure Kubernetes Service (AKS)
- Microsoft Entra Workload ID
- Azure Container Registry (ACR)
- Azure CLI

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Microsoft Azure integration documentation: https://fluxcd.io/flux/integrations/azure/
- Flux installation requirements: https://fluxcd.io/flux/installation/
- Microsoft Learn, AKS workload identity deployment: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn, az identity federated-credential: https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential
- Microsoft Learn, az acr scope-map: https://learn.microsoft.com/en-us/cli/azure/acr/scope-map
- Microsoft Learn, az acr token: https://learn.microsoft.com/en-us/cli/azure/acr/token
- Microsoft Learn, az acr token credential: https://learn.microsoft.com/en-us/cli/azure/acr/token/credential

## Issues Found
- The introduction said the guide covered admin credentials, but the post does not include an admin credentials approach. Removed that phrase to match the actual content.
- The Kubernetes prerequisite specified v1.20 or later, which is stale for current Flux releases. Reworded it to require a Kubernetes version supported by the reader's Flux release.
- The workload identity setup only captured and annotated the managed identity client ID. Flux's current Azure integration guidance uses both `azure.workload.identity/client-id` and `azure.workload.identity/tenant-id`, so the managed identity tenant ID lookup and annotation were added.
- The federated credential command used `--audience`; the current Azure CLI reference documents `--audiences`. Updated the command to use the documented flag.

## Review Notes
- The `provider: azure` usage for `OCIRepository` and OCI `HelmRepository` matches Flux documentation.
- The Docker registry Secret format for static ACR token and service principal authentication matches Flux's `secretRef` expectations for image pull style credentials.
- The local environment did not have the Azure CLI installed, so Azure command validation was performed against Microsoft Learn CLI references instead of local `az --help` output.
