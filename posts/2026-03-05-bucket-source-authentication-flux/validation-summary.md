# Validation Summary: How to Configure Bucket Source Authentication in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD source-controller Bucket API
- Kubernetes Secrets and ServiceAccounts
- AWS S3 authentication and IRSA
- Google Cloud Storage authentication and GKE Workload Identity
- Azure Blob Storage authentication and Azure Workload Identity
- TLS and mutual TLS for S3-compatible bucket endpoints

## Sources Consulted
- Flux Bucket source documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux AWS integration documentation: https://fluxcd.io/flux/integrations/aws/
- Flux Workload Identity configuration documentation: https://fluxcd.io/flux/installation/configuration/workload-identity/
- Flux Azure integration documentation: https://fluxcd.io/flux/integrations/azure/
- Kubernetes kubectl command reference for `kubectl create secret generic`: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The Azure identity section described the no-secret option as "Managed Identity enabled on AKS" without the required Azure Workload Identity setup. Updated the section to use Azure Workload Identity terminology, add the source-controller service account annotations and labels, patch the source-controller pod template label, and clarify that the no-secret Bucket example relies on Azure Workload Identity.
- Updated the provider table, flowchart, best practices, and conclusion to consistently refer to Workload Identity for managed Kubernetes authentication instead of broadly saying Managed Identity for AKS.

## Review Notes
- The Flux Bucket API version, provider values, `secretRef`, `certSecretRef`, `insecure`, and provider-specific secret keys matched current Flux documentation.
- The local environment did not have `kubectl` or `flux` installed, so CLI syntax was checked against official documentation instead of local `--help` output.
