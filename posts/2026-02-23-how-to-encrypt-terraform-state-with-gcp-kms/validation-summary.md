# Validation Summary: How to Encrypt Terraform State with GCP KMS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Google Cloud Platform (GCP)
- Google Cloud KMS (Customer-Managed Encryption Keys / CMEK)
- Google Cloud Storage (GCS) as a Terraform backend
- VPC Service Controls (Access Context Manager)
- Cloud Audit Logs
- BigQuery (as a log sink destination)
- gcloud and gsutil CLI tools

## Sources Consulted
- Terraform GCP provider docs: `google_kms_key_ring`, `google_kms_crypto_key`, `google_kms_crypto_key_iam_binding`, `google_kms_crypto_key_iam_member` (https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- Terraform GCP provider docs: `google_storage_bucket`, `google_storage_project_service_account`, `google_storage_bucket_iam_member`
- Terraform GCS backend docs: https://developer.hashicorp.com/terraform/language/backend/gcs (confirms `kms_encryption_key` field)
- Terraform GCP provider docs: `google_access_context_manager_access_policy`, `google_access_context_manager_service_perimeter`
- Terraform GCP provider docs: `google_project_iam_audit_config`, `google_logging_project_sink`, `google_bigquery_dataset_iam_member`
- gcloud CLI reference: `gcloud kms keys describe/update`, `gcloud kms keys versions list/enable/restore`, `gcloud logging read`
- Google Cloud IAM predefined roles for Cloud KMS (https://cloud.google.com/kms/docs/reference/permissions-and-roles) — verified `roles/cloudkms.cryptoKeyEncrypterDecrypter` and `roles/cloudkms.cryptoKeyDecrypter`
- Cloud KMS audit log types: DATA_READ, DATA_WRITE, ADMIN_READ
- Cloud Audit Logs `cloudkms_cryptokey` resource labels: `project_id`, `location`, `key_ring_id`, `crypto_key_id`

## Issues Found
1. **IAM binding/member conflict on the same role.** The original post used `google_kms_crypto_key_iam_binding` to grant `roles/cloudkms.cryptoKeyEncrypterDecrypter` to the GCS service agent, and later used `google_kms_crypto_key_iam_member` to grant the same role to a Terraform service account on the same key. Because `iam_binding` is authoritative for the role, the two resources would fight on every `terraform apply` — the binding would remove the member added by `iam_member`, then the member would re-add itself. Fixed by converting the binding to `google_kms_crypto_key_iam_member` (additive, non-authoritative) so both bindings can coexist cleanly. Updated the corresponding `depends_on` reference in the storage bucket resource to point at the renamed resource.

## Review Notes
- The `lifecycle_rule` block inside `google_storage_bucket` coexists with the Terraform meta-argument `lifecycle { prevent_destroy = true }` — this is valid; they are distinct concepts (GCS object lifecycle rules vs Terraform resource lifecycle meta-argument).
- `rotation_period = "7776000s"` correctly equals 90 days.
- KMS resource locations (e.g. `us-east1`) must be lowercase; GCS bucket `location` accepts either case but the GCS API normalizes case.
- The `date -u -d "+1 day"` idiom relies on GNU date; readers on macOS/BSD will need to adjust.
- The Service Perimeter snippet references `google_access_context_manager_access_level.trusted_networks` which is not defined in the post — this is acknowledged contextually as an illustrative example.
- `roles/cloudkms.cryptoKeyDecrypter` (used for auditor decrypt access) is a valid predefined Cloud KMS role, distinct from `roles/cloudkms.cryptoKeyEncrypterDecrypter`.
- The GCS backend's `kms_encryption_key` configuration argument was verified against the official Terraform GCS backend documentation and is correct.
