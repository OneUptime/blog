# Validation Summary: How to Configure Bucket Source with Google Cloud Storage in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD source-controller Bucket API
- Flux CD Kustomization API
- Kubernetes ServiceAccounts and Secrets
- Google Cloud Storage
- Google Cloud IAM service accounts and IAM roles
- GKE Workload Identity Federation
- Google Cloud CLI (`gcloud`)
- Google Cloud Build
- GitHub Actions for Google Cloud authentication and GCS uploads

## Sources Consulted
- Flux Bucket API documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux Google Cloud Platform integration documentation: https://fluxcd.io/flux/integrations/gcp/
- GKE Workload Identity Federation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud Storage IAM roles documentation: https://cloud.google.com/storage/docs/access-control/iam-roles
- Google Cloud SDK `gcloud storage buckets add-iam-policy-binding` documentation: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/add-iam-policy-binding
- google-github-actions/auth documentation: https://github.com/google-github-actions/auth
- google-github-actions/upload-cloud-storage documentation: https://github.com/google-github-actions/upload-cloud-storage

## Issues Found
- Updated the GitHub Actions examples from `google-github-actions/auth@v2` and `google-github-actions/upload-cloud-storage@v2` to the current `@v3` versions shown in the official action documentation.
- Added `parent: false` to the `upload-cloud-storage` example. The official action includes the parent directory by default, so `path: manifests` without this option uploads objects under `gs://my-app-flux-manifests/manifests/...` instead of matching the rest of the post's bucket-root manifest layout.

## Review Notes
The Flux `Bucket` examples use valid `source.toolkit.fluxcd.io/v1` fields, including `provider`, `bucketName`, `endpoint`, `prefix`, `secretRef`, and the secret data key name `serviceaccount`. The GCS IAM roles in the post match Flux's recommended roles for the Bucket API. The Workload Identity example uses controller-level authentication by annotating the Flux `source-controller` ServiceAccount, which is supported by Flux for GKE.
