# Validation Summary: How to Configure Flux with Managed Identity for ACR on AKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Azure Kubernetes Service (AKS)
- Azure Container Registry (ACR)
- Azure managed identities
- Azure CLI
- Kubernetes custom resources

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux Azure integration documentation: https://fluxcd.io/flux/integrations/azure/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI documentation for `flux get sources oci`: https://fluxcd.io/flux/cmd/flux_get_sources_oci/
- Flux CLI documentation for `flux bootstrap github`: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Azure AKS and ACR integration documentation: https://learn.microsoft.com/azure/aks/cluster-container-registry-integration
- Azure AKS managed identity overview: https://learn.microsoft.com/azure/aks/managed-identity-overview
- Azure CLI documentation for `az aks check-acr`: https://learn.microsoft.com/cli/azure/aks

## Issues Found
- The introduction blurred the distinction between Kubernetes pulling workload container images and Flux pulling OCI artifacts or scanning image tags. Updated the wording to clarify that kubelets pull workload images, while Flux applies manifests and can authenticate to ACR for OCI artifacts and image metadata scanning.
- The OCIRepository example was described as pointing to ACR generally. Updated the wording to clarify that `OCIRepository` should point to an OCI artifact repository in ACR.
- The explanation of `provider: azure` was too broad. Updated it to match Flux documentation: Azure authentication can use the kubelet managed identity when that identity has ACR access.
- The image automation section implied that `ImageRepository` and `ImagePolicy` alone automatically update image tags. Updated it to clarify that they scan and select tags, while automatic Git updates also require image policy markers and an `ImageUpdateAutomation` resource. Also noted that the image automation controllers must be installed.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI flags were verified against Microsoft Learn rather than local `az --help` output.
- The example uses the `latest` tag for an OCIRepository. This is syntactically valid, but immutable tags or digests are usually preferable for production GitOps workflows.
