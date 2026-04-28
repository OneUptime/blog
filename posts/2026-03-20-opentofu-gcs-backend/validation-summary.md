# Validation Summary: How to Configure the GCS Backend in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform (`terraform { backend "gcs" {} }` block)
- Google Cloud Storage (GCS)
- Google Cloud KMS (Cloud KMS / CMEK)
- Google Cloud IAM
- Google Cloud Build
- HCL configuration language

## Sources Consulted
- OpenTofu GCS backend documentation: https://opentofu.org/docs/language/settings/backends/gcs/
- OpenTofu state locking documentation: https://opentofu.org/docs/language/state/locking/
- OpenTofu official container image on GHCR: https://github.com/opentofu/opentofu/pkgs/container/opentofu
- Google Cloud `gcloud storage buckets add-iam-policy-binding` command reference
- Google `google_storage_bucket` Terraform resource reference

## Issues Found

1. **Incorrect parameter name for KMS encryption** — In the "Customer-Managed Encryption" section, the post used `encryption_key` with a Cloud KMS key resource path (`projects/.../locations/.../keyRings/.../cryptoKeys/...`). This is incorrect: per the OpenTofu GCS backend docs, `encryption_key` is for a 32-byte base64-encoded customer-supplied AES-256 key (CSEK), while `kms_encryption_key` is the parameter that takes a Cloud KMS key resource path (CMEK). Changed `encryption_key` → `kms_encryption_key`.

2. **Wrong container image for OpenTofu in Cloud Build example** — The Cloud Build example referenced `hashicorp/terraform` as the step image with `entrypoint: tofu`. The HashiCorp Terraform image does not contain the `tofu` binary, so overriding the entrypoint to `tofu` will fail. Changed the image to the official OpenTofu container image `ghcr.io/opentofu/opentofu` and removed the now-unnecessary entrypoint override (the image's default entrypoint is `tofu`).

3. **Misleading state locking description** — The introduction described locking as "using GCS object locks". GCS has a specific feature literally called "Object Lock" used for object retention/legal holds, which is not what the GCS backend uses for state locking — the backend writes a lock file (`<state>.tflock`) with a generation precondition. Reworded to "using a lock object in the bucket" to avoid implying use of the GCS Object Lock retention feature.

## Review Notes

- The basic backend block syntax (`terraform { backend "gcs" {} }`) is the correct form for OpenTofu — OpenTofu currently still uses the `terraform` block for top-level settings, mirroring Terraform.
- The state path explanation (`gs://my-tofu-state/production/default.tfstate`) is consistent with the GCS backend's `<prefix>/<workspace>.tfstate` layout.
- The `google_storage_bucket` resource configuration (versioning, lifecycle_rule with `num_newer_versions`, `uniform_bucket_level_access`) is correct against the current Google provider.
- The `gcloud storage buckets add-iam-policy-binding` commands and IAM roles (`roles/storage.objectAdmin`, `roles/storage.objectViewer`) are valid.
- Authentication options listed (ADC, `GOOGLE_APPLICATION_CREDENTIALS`, Workload Identity) are all currently supported by the backend.
- The post does not mention the `universe_domain` or `storage_custom_endpoint` options, but these are advanced/optional and not needed for a general intro guide.
