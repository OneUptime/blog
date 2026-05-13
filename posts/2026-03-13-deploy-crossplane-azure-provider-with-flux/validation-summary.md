# Validation Summary: How to Deploy the Crossplane Azure Provider with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane
- Upbound provider-family-azure
- Upbound Azure service providers
- Flux CD Kustomization
- Kubernetes Secrets and custom resources
- Azure CLI service principals
- Microsoft Entra Workload ID / managed identity

## Sources Consulted
- Crossplane Providers documentation: https://docs.crossplane.io/v1.20/concepts/providers/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Microsoft Learn Azure CLI `az ad sp create-for-rbac` reference: https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Upbound Marketplace ProviderConfig reference for provider-family-azure v1.3.0: https://marketplace.upbound.io/providers/upbound/provider-family-azure/v1.3.0/resources/azure.upbound.io/ProviderConfig/v1beta1
- Upbound provider-azure v1.3.0 quickstart and examples: https://github.com/upbound/provider-azure/tree/v1.3.0/docs/family
- Microsoft Learn AKS Workload Identity overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview

## Issues Found
- The Azure CLI command used the deprecated `--sdk-auth` flag. Changed it to `--json-auth`, which Microsoft documents as the current option for JSON authentication output.
- The introduction said Flux continuously reconciles Azure resources. Adjusted the wording to distinguish Flux applying Kubernetes manifests from Git and Crossplane reconciling the external Azure resources.
- The managed identity best-practice wording conflated AKS Workload Identity with Azure Managed Identity. Updated it to refer to Microsoft Entra Workload ID or managed identity.

## Review Notes
- The pinned Upbound Azure provider version `v1.3.0` is older than current provider releases, but the package names and `azure.upbound.io/v1beta1` `ProviderConfig` syntax are valid for that version.
- The Flux Kustomization assumes a separate Flux Kustomization named `crossplane` exists in the same namespace, which is a reasonable convention but repository-specific.
