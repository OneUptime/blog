# Validation Summary: How to Configure Flux CD with Azure Blob Storage Bucket Source

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD source-controller Bucket API
- Flux CD kustomize-controller Kustomization API
- Azure Blob Storage
- Azure CLI
- Azure Kubernetes Service
- Microsoft Entra Workload ID / workload identity federation
- Kubernetes manifests and Secrets
- Azure Pipelines

## Sources Consulted
- Flux Bucket API documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux Azure integration documentation: https://fluxcd.io/flux/integrations/azure/
- Flux 2.4 GA announcement: https://fluxcd.io/blog/2024/09/flux-v2.4.0/
- Microsoft Learn AKS Workload Identity overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn Azure CLI `az storage container` reference: https://learn.microsoft.com/en-us/cli/azure/storage/container?view=azure-cli-latest
- Microsoft Learn Blob containers with Azure CLI: https://learn.microsoft.com/en-us/azure/storage/blobs/blob-containers-cli

## Issues Found
- The setup created a storage account in a resource group that was never created. Added an `az group create` command before `az storage account create` so the commands work for a fresh demo environment.
- The Workload Identity patch only labeled and annotated the `source-controller` ServiceAccount. AKS Workload Identity requires the pod template label `azure.workload.identity/use: "true"` for mutation, and Flux documentation shows patching the source-controller Deployment as well. Added a Deployment patch with the required pod template label.
- The SAS token examples used the Flux secret key `sasToken`, but Flux Azure Bucket authentication expects `sasKey`. Updated the create and rotation commands to use `sasKey`.
- The SAS and account key Bucket examples used `provider: generic`. Azure Blob Storage authentication with SAS or shared key is documented under the Flux Azure provider, so changed those examples to `provider: azure`.
- The SAS expiry command used BSD/macOS `date -v+1y`, which fails in the Linux shell used by the Azure CLI examples and Azure Pipelines. Replaced it with the GNU/Linux `date -u -d "+1 year"` form used in Microsoft Azure CLI documentation.
- The prerequisites allowed Flux CLI v2.2, but the examples use the GA `source.toolkit.fluxcd.io/v1` Bucket API documented with Flux 2.4. Updated the prerequisite to Flux CLI v2.4 or later.

## Review Notes
The tutorial is technically relevant and current for the Flux `source.toolkit.fluxcd.io/v1` Bucket API. The Workload Identity instructions assume the AKS cluster already has OIDC issuer and Workload Identity enabled; that is consistent with the authentication method but should remain a deployment prerequisite for readers.
