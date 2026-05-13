# Validation Summary: How to Configure Flux OCI Secret with GCR Service Account Key

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD source-controller
- Flux `OCIRepository`
- Flux `HelmRepository` with OCI repositories
- Kubernetes Secrets of type `kubernetes.io/dockerconfigjson`
- `kubectl`
- Google Artifact Registry and `gcr.io` repositories
- Google Cloud IAM service accounts and service account keys
- Google Cloud CLI

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux CLI `reconcile source oci` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_oci/
- Kubernetes `kubectl create secret docker-registry` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Google Artifact Registry Docker authentication documentation: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Google Artifact Registry IAM access control documentation: https://cloud.google.com/artifact-registry/docs/access-control
- Google Artifact Registry transition from Container Registry documentation: https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud SDK `gcloud iam service-accounts create` reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Google Cloud SDK `gcloud iam service-accounts keys create` reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create

## Issues Found
- The post described current `gcr.io` usage as Google Container Registry without noting the Container Registry shutdown. Updated the introduction, description, prerequisites, and registry hostname troubleshooting text to distinguish Artifact Registry-backed `gcr.io` repositories from legacy Container Registry.
- The prerequisite IAM role listed `roles/storage.objectViewer` for legacy GCR. Since current `gcr.io` usage should be Artifact Registry-backed, changed the prerequisite to `roles/artifactregistry.reader`.
- The declarative Secret manifest attempted to interpolate the raw service account JSON key into another JSON document. That would produce invalid JSON because the embedded quotes were not escaped. Replaced it with a `jq`-based construction that safely builds `.dockerconfigjson` and computes the `auth` value.
- The post used `jq` in commands but did not list it as a prerequisite. Added `jq` to the prerequisites.
- The generated manifest used GNU-specific `base64 -w 0`. Replaced it with `base64 | tr -d '\n'` for better portability.

## Review Notes
- The Flux `OCIRepository` and OCI `HelmRepository` examples use valid `source.toolkit.fluxcd.io/v1` fields. Flux documentation notes that OCI `HelmRepository` support is in maintenance mode and recommends `OCIRepository` for improved OCI Helm chart support, but the shown `HelmRepository` example remains valid.
- Google documents service account keys as the least secure Docker authentication method and recommends access tokens or credential helpers when possible. The post already includes a Workload Identity recommendation for GKE and key handling best practices.
