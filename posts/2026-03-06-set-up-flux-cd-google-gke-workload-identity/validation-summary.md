# Validation Summary: How to Set Up Flux CD on Google GKE with Workload Identity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Google Kubernetes Engine (GKE)
- Workload Identity Federation for GKE
- Google Cloud IAM service accounts
- Google Artifact Registry
- Google Cloud Source Repositories
- Kubernetes ServiceAccounts
- Kustomize patches
- SOPS with Cloud KMS

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux bootstrap GitHub CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Cloud Source Repositories documentation: https://cloud.google.com/source-repositories/docs

## Issues Found
- The prerequisites said Owner or Editor was sufficient. Updated this to the specific IAM capabilities needed to manage GKE clusters, service accounts, and project IAM bindings, because the GKE Workload Identity documentation lists explicit IAM roles for these operations.
- Cloud Source Repositories was listed as a required API and IAM role target. Updated it to be optional because Google Cloud documentation states that Cloud Source Repositories is not available to new customers as of June 17, 2024.
- The Flux bootstrap command omitted the optional image automation components, but later steps use `ImageRepository`, `ImagePolicy`, and `image-reflector-controller`. Added `--components-extra=image-reflector-controller,image-automation-controller`.
- The declarative Kustomize patch used JSON Patch operations that can fail if `/metadata/annotations` does not already exist. Replaced those with strategic merge-style patches matching Flux documentation examples for ServiceAccount annotations.
- The summary overclaimed Cloud Source Repositories as part of the default setup. Narrowed the summary to Artifact Registry, with Cloud Source Repositories described only as optional earlier in the post.

## Review Notes
The Flux `provider: gcp` examples for `OCIRepository`, OCI `HelmRepository`, and `ImageRepository` are valid for current Flux APIs. The GKE Workload Identity binding and Kubernetes ServiceAccount annotation flow remains supported, though Google Cloud now presents direct IAM principal bindings as the preferred approach and service-account impersonation as an alternative.
