# Validation Summary: How to Configure the GCS Backend in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Google Cloud Storage (GCS)
- OpenTofu `gcs` backend
- HashiCorp Google provider (`google_storage_bucket`, bucket IAM resources)
- Google Cloud IAM
- Cloud KMS customer-managed encryption keys (CMEK)
- GKE Workload Identity

## Sources Consulted
- OpenTofu GCS backend documentation: https://opentofu.org/docs/language/settings/backends/gcs/
- OpenTofu state locking documentation: https://opentofu.org/docs/language/state/locking/
- OpenTofu `force-unlock` command documentation: https://opentofu.org/docs/cli/commands/force-unlock/
- OpenTofu GCS backend implementation (`backend_state.go`): https://raw.githubusercontent.com/opentofu/opentofu/main/internal/backend/remote-state/gcs/backend_state.go
- OpenTofu GCS backend implementation (`client.go`): https://raw.githubusercontent.com/opentofu/opentofu/main/internal/backend/remote-state/gcs/client.go
- Google provider `google_storage_bucket` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/storage_bucket.html.markdown
- Google provider bucket IAM resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/storage_bucket_iam.html.markdown
- Cloud Storage public access prevention: https://cloud.google.com/storage/docs/public-access-prevention
- Cloud Storage uniform bucket-level access: https://cloud.google.com/storage/docs/uniform-bucket-level-access
- Cloud Storage Object Versioning: https://cloud.google.com/storage/docs/object-versioning
- Cloud Storage soft delete: https://cloud.google.com/storage/docs/soft-delete
- Cloud Storage IAM roles: https://cloud.google.com/storage/docs/access-control/iam-roles
- Cloud Storage customer-managed encryption keys: https://cloud.google.com/storage/docs/encryption/customer-managed-keys
- Use customer-managed encryption keys in Cloud Storage: https://cloud.google.com/storage/docs/encryption/using-customer-managed-keys
- Workload Identity Federation for GKE: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity

## Issues Found
- The post used `google_storage_bucket_iam_binding` with `members = []` to "prevent public access". That does not enforce public access prevention and is not the correct mechanism for blocking public access. I replaced it with `public_access_prevention = "enforced"` on the bucket, which is the documented bucket setting for this purpose.
- The post said GCS backend locking works via "GCS object locks" and showed a `.lock` file path. The current OpenTofu GCS backend uses a separate lock object with a `.tflock` suffix and the documented recovery mechanism is `tofu force-unlock LOCK_ID`. I updated the explanation and command accordingly.
- The post described `prefix` as creating a directory structure and described the soft delete block as enabling soft delete. I tightened those details to match current GCS behavior more closely: GCS uses prefix-based object paths, and the snippet is setting the soft delete retention period to 30 days.

## Review Notes
- The post remains technically relevant and code-focused, so `validated` was the correct status after fixes.
- OpenTofu still uses the `terraform { backend "gcs" { ... } }` block syntax; that part of the post was already correct.
- Current Cloud Storage documentation says soft delete is enabled by default on new buckets with a seven-day retention period. The post now correctly shows explicitly setting a 30-day retention period.
- The `tofu` CLI was not available in the local environment on 2026-05-06, so runtime backend initialization was not performed. The review relied on official OpenTofu documentation, official Google Cloud documentation, and the current upstream OpenTofu/backend source for lock-file behavior.
