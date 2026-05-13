# Validation Summary: How to Configure Flux with Workload Identity for Blob Storage on AKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Kubernetes
- Azure Kubernetes Service
- Microsoft Entra Workload ID
- Azure Blob Storage
- Azure CLI
- Kubernetes ServiceAccount and Deployment patches
- Flux Bucket and Kustomization resources

## Sources Consulted
- Flux Bucket documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmChart documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Microsoft AKS Workload Identity overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft AKS Workload Identity deployment guide: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Azure CLI `az storage blob` documentation: https://learn.microsoft.com/en-us/cli/azure/storage/blob
- Azure CLI `az storage container-rm` documentation: https://learn.microsoft.com/en-us/cli/azure/storage/container-rm
- Azure CLI `az role assignment` documentation: https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Azure CLI `az identity` documentation: https://learn.microsoft.com/en-us/cli/azure/identity

## Issues Found
- The introduction said Azure Blob Storage can serve OCI artifacts for Flux. Flux's `Bucket` source is for object storage contents, while Flux OCI artifacts are consumed through OCI registry sources. Changed this to Kubernetes manifests and Helm chart directories.
- The RBAC example granted `Storage Blob Data Reader` at the whole storage account scope. This works but is broader than the Flux documentation's container-scoped example. Changed the command to resolve the container resource ID with `az storage container-rm show` and assign the role at the blob container scope. Also added `--assignee-principal-type ServicePrincipal`, which Azure CLI recommends with `--assignee-object-id` to avoid Microsoft Graph propagation issues.
- The upload step packaged manifests into a single `artifacts.tar.gz` blob. Flux `Bucket` sources fetch the objects in the bucket and produce their own source artifact; a nested tarball would leave the Kustomization with only the tar file at `path: ./`, not the unpacked manifests. Changed the example to `az storage blob upload-batch --source ./deploy --destination flux-artifacts` so the manifest files are available directly in the Bucket source artifact.

## Review Notes
- The service account annotation and pod-template label are consistent with Microsoft Entra Workload ID requirements and Flux's Azure Bucket workload identity example.
- The Bucket and Kustomization API versions and fields used in the post are current for Flux v2.
