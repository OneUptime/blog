# Validation Summary: How to Configure Bucket Source with Azure Blob Storage in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD source-controller Bucket API
- Flux CD Kustomization API
- Kubernetes Secrets and custom resources
- Azure Blob Storage
- Azure CLI
- Azure Kubernetes Service (AKS)
- Azure Managed Identity and Azure RBAC
- Azure DevOps Pipelines

## Sources Consulted
- Flux Bucket documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux Azure integration documentation: https://fluxcd.io/flux/integrations/azure/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Microsoft Learn, Azure Storage Blob CLI reference: https://learn.microsoft.com/en-us/cli/azure/storage/blob?view=azure-cli-latest
- Microsoft Learn, Azure Storage Container CLI reference: https://learn.microsoft.com/en-us/cli/azure/storage/container?view=azure-cli-latest
- Microsoft Learn, authorize blob data operations with Azure CLI: https://learn.microsoft.com/en-us/azure/storage/blobs/authorize-data-operations-cli
- Microsoft Learn, AKS system-assigned managed identity: https://learn.microsoft.com/en-us/azure/aks/system-assigned-managed-identity
- Microsoft Learn, pre-created kubelet managed identity in AKS: https://learn.microsoft.com/en-us/azure/aks/pre-created-kubelet-managed-identity

## Issues Found
- The Managed Identity section described Flux source-controller as authenticating with "the pod's managed identity." The Flux Bucket configuration is valid, but that wording was too broad for AKS because pod-scoped identity normally requires Azure Workload Identity, while the example grants the AKS kubelet managed identity. Updated the explanation to say source-controller uses a managed identity available through the Azure SDK authentication chain and noted that Azure Workload Identity is the preferred production approach for pod-scoped access on AKS.
- The AKS migration command enabled managed identity on an existing cluster but did not mention the required node image upgrade caveat for clusters migrated from service principals. Added the `az aks nodepool upgrade --node-image-only` command with a placeholder node pool name, matching Microsoft Learn guidance that kubelet continues using the service principal until the agent pool is upgraded.

## Review Notes
The Flux Bucket examples use current `source.toolkit.fluxcd.io/v1` fields and valid Azure credential secret keys: `accountKey`, `sasKey`, and `clientId`. The SAS token permissions `rl` match Flux's documented minimum read/list requirement. The Azure CLI storage commands are valid, but in real environments users may need explicit `--auth-mode login`, `--account-key`, `--sas-token`, or corresponding environment variables depending on RBAC and account key access policies.
