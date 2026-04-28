# Validation Summary: How to Use GCS Bucket Module Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform module sources (go-getter)
- Google Cloud Storage (GCS)
- Google Cloud IAM
- gcloud CLI / gsutil
- Google Cloud Build
- Application Default Credentials (ADC) / Workload Identity

## Sources Consulted
- OpenTofu module sources documentation: https://opentofu.org/docs/language/modules/sources/
- Terraform module sources (GCS): https://developer.hashicorp.com/terraform/language/modules/sources#gcs-bucket
- go-getter GCS protocol: https://github.com/hashicorp/go-getter
- gcloud storage buckets add-iam-policy-binding reference
- OpenTofu Docker image: ghcr.io/opentofu/opentofu
- HashiCorp Terraform Docker image: hashicorp/terraform on Docker Hub

## Issues Found
- **Cloud Build image incorrect.** The example used `name: 'hashicorp/terraform:latest'` while setting `entrypoint: tofu`. The HashiCorp Terraform image only ships the `terraform` binary; it does not contain `tofu`, so the build step would fail with "tofu: not found". Replaced both step images with the official OpenTofu image `ghcr.io/opentofu/opentofu:latest`, which is consistent with the rest of the post (which is about OpenTofu, not Terraform).

## Review Notes
- The `gcs::https://www.googleapis.com/storage/v1/BUCKET/PATH/TO/module.zip` URL format is correct per the OpenTofu module sources documentation.
- The `//` subdirectory selector syntax inside an archive is supported by go-getter and correctly demonstrated.
- Authentication options listed (ADC via `gcloud auth application-default login`, `GOOGLE_APPLICATION_CREDENTIALS`, and Workload Identity / GCE-attached credentials) match the OpenTofu docs. The official docs additionally mention `GOOGLE_OAUTH_ACCESS_TOKEN`, but the post's coverage is accurate as far as it goes.
- `gcloud storage buckets add-iam-policy-binding gs://BUCKET ...` is the current, supported form (the older `gsutil iam ch` is deprecated alongside `gsutil` in favor of `gcloud storage`).
- Pinning module versions via the object path is a sound recommendation; combining it with bucket Object Versioning (mentioned in the post) is a reasonable defense-in-depth strategy.
- Future reader caveat: when running OpenTofu under GKE/Cloud Run/Cloud Build with Workload Identity, the service account used for the workload (not the user's account) needs `roles/storage.objectViewer` on the bucket — this is implied by the post but not made fully explicit.
