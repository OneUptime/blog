# Validation Summary: How to Install Flux CD with Custom Service Account

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes ServiceAccounts
- Kubernetes RBAC
- Kustomize overlays and patches
- AWS IAM Roles for Service Accounts (IRSA)
- GKE Workload Identity

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux `install` CLI documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux workload identity documentation: https://fluxcd.io/flux/installation/configuration/workload-identity/
- Flux multi-tenancy and impersonation documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux Kustomization service account documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease service account documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Current Flux install manifest from GitHub releases: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- Google Cloud GKE Workload Identity documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity

## Issues Found
- The prerequisite "Kubernetes cluster (v1.20+)" was outdated for current Flux releases. I changed it to require a Kubernetes version supported by the Flux release being installed.
- The custom RBAC examples were incomplete and would not fully authorize the custom service accounts used by the Flux controller Deployments. I replaced them with patches for Flux-generated `cluster-reconciler` and `crd-controller` ClusterRoleBindings, matching the current Flux install manifest model.
- The Kustomize overlay did not include the custom service account manifest or RBAC binding patch file as resources/patches. I updated the overlay to include `custom-service-accounts.yaml` and apply `rbac-patches.yaml`.

## Review Notes
- The GKE example uses the valid "link Kubernetes ServiceAccounts to IAM service accounts" approach with `roles/iam.workloadIdentityUser` and the `iam.gke.io/gcp-service-account` annotation. Google now recommends direct IAM principal identifiers where supported, but the linked IAM service account method remains documented for cases that need IAM service account impersonation.
- If readers install optional Flux components such as image automation or source-watcher, they must include those components' custom service accounts in the patched ClusterRoleBindings as noted in the post.
