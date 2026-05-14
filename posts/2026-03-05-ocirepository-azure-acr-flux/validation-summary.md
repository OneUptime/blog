# Validation Summary: How to Configure OCIRepository with Azure ACR in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux OCIRepository
- Kubernetes
- Azure Container Registry (ACR)
- Azure Kubernetes Service (AKS)
- Microsoft Entra Workload ID
- Azure CLI
- Kubernetes Secrets

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux OCI artifacts cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux Source API v1 reference: https://fluxcd.io/flux/components/source/api/v1/
- Microsoft Entra Workload ID for AKS overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Entra Workload ID AKS deployment guide: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Azure CLI federated identity credential reference: https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential
- Azure CLI ACR network-rule reference: https://learn.microsoft.com/en-us/cli/azure/acr/network-rule
- Azure Container Registry geo-replication documentation: https://learn.microsoft.com/en-gb/azure/container-registry/container-registry-geo-replication

## Issues Found
- The Workload Identity setup labeled only the `source-controller` ServiceAccount. Flux documentation and AKS Workload Identity documentation require the `azure.workload.identity/use: "true"` label on the source-controller pod template so the mutating webhook injects the projected token and Azure environment variables. Added a `kubectl patch deployment source-controller` command to label the pod template.
- The `flux push artifact --revision` example used `main/<commit>`. Flux documentation uses the traceable revision format `<branch>@sha1:<commit>`. Updated the example to `main@sha1:$(git rev-parse HEAD)`.
- The ACR geo-replication troubleshooting note incorrectly implied using a region-specific login server URL. Azure Container Registry geo-replication uses the registry's global login server and routes requests to the best geo-replica. Updated the note accordingly.

## Review Notes
The post is technically relevant and the remaining commands and manifests are consistent with the official Flux and Azure documentation reviewed. The `source.toolkit.fluxcd.io/v1` OCIRepository examples match current Flux documentation, and `provider: azure` is a valid provider for ACR authentication.
