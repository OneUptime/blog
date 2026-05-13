# Validation Summary: How to Deploy the Crossplane GCP Provider with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane
- Upbound GCP provider family
- Flux CD Kustomization
- Google Cloud IAM service accounts and service account keys
- GKE Workload Identity Federation
- Kubernetes Secrets and kubectl
- Google Cloud CLI

## Sources Consulted
- Crossplane provider package documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane Provider package API and runtime configuration documentation: https://docs.crossplane.io/latest/api/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization health checks and dependencies documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Upbound provider-family-gcp Marketplace documentation: https://marketplace.upbound.io/providers/upbound/provider-family-gcp/latest
- Upbound GCP ProviderConfig API reference: https://marketplace.upbound.io/providers/upbound/provider-family-gcp/v2.5.3/resources/gcp.m.upbound.io/ProviderConfig/v1beta1
- Upbound GCP v2 cluster-scoped ProviderConfig Go API reference: https://pkg.go.dev/github.com/upbound/provider-gcp/v2/apis/cluster/v1beta1
- Upbound package policies and availability documentation: https://docs.upbound.io/manuals/packages/policies/
- Google Cloud IAM service account creation documentation: https://cloud.google.com/iam/docs/creating-managing-service-accounts
- Google Cloud service account key documentation: https://cloud.google.com/iam/docs/keys-create-delete
- Google Cloud service account key rotation documentation: https://cloud.google.com/iam/docs/key-rotation
- GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Kubernetes kubectl create secret reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post pinned Upbound GCP provider packages to `v1.3.0`, which is outdated for a 2026 guide and may fall outside Upbound's current public availability window for main releases. Updated the package tags to the current `v2` major tag and clarified that Crossplane 2.0 or later is required.
- The introduction said Workload Identity automatically binds a Kubernetes service account to a GCP service account. Updated the wording to clarify that IAM permission and service account configuration are required.
- The Workload Identity best-practice bullet said to annotate the Crossplane service account. Updated it to refer to the provider's Kubernetes service account, configured through a Crossplane `DeploymentRuntimeConfig`, with `roles/iam.workloadIdentityUser`, the `iam.gke.io/gcp-service-account` annotation, and `InjectedIdentity` credentials.

## Review Notes
The service account key flow, Kubernetes Secret command, ProviderConfig fields, Flux Kustomization fields, and verification commands are consistent with the cited documentation. The guide still uses a broad `roles/editor` binding for setup convenience, but it correctly tells readers to narrow permissions for the provider.
