# Validation Summary: How to Configure HelmRepository with Azure ACR for Helm OCI in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller HelmRepository
- Flux helm-controller HelmRelease
- Kubernetes
- Helm OCI registries
- Azure Kubernetes Service (AKS)
- Azure Container Registry (ACR)
- Azure Workload Identity
- Azure CLI
- kubectl

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux on Azure documentation: https://v2-0.docs.fluxcd.io/flux/use-cases/azure/
- Azure Container Registry Helm OCI documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-helm-repos
- Microsoft Learn AKS workload identity overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn Azure CLI federated identity credential reference: https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential?view=azure-cli-latest
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/
- Helm push command reference: https://helm.sh/docs/helm/helm_push/

## Issues Found
- The introduction and prerequisites referred to AAD Pod Identity as an alternative authentication option. AAD Pod Identity is deprecated, and current Flux documentation describes the Azure provider in terms of Azure Workload Identity and kubelet managed identity. Updated the wording to avoid recommending AAD Pod Identity.
- The HelmRepository examples used `interval: 5m` without noting that Flux ignores `.spec.interval` for OCI HelmRepository resources. Added comments clarifying that the field is ignored for OCI HelmRepository objects.
- The verification step implied OCI HelmRepository objects report status in the same way as HTTP/S Helm repositories. Added a short note that OCI HelmRepository resources are data containers for HelmChart resources and may not report the same Ready status details.

## Review Notes
- The HelmRepository `type: oci` approach remains supported but is in maintenance mode in current Flux documentation; Flux recommends the OCIRepository API for improved OCI chart support in new designs.
- The Helm push and Azure ACR commands match current Azure and Helm documentation for storing Helm charts as OCI artifacts.
- The Workload Identity service account annotation, pod template label, federated credential subject, audience, and AcrPull role assignment are consistent with current Microsoft and Flux documentation.
