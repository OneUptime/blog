# Validation Summary: How to Create GCP Cloud Storage Buckets with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (hashicorp/google provider ~> 5.0)
- Google Cloud Platform (GCP)
- Google Cloud Storage (buckets, storage classes, lifecycle rules)
- Cloud KMS (customer-managed encryption keys)
- GCP IAM (bucket-level IAM bindings, IAM conditions)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- [Terraform Registry: google_storage_bucket](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket)
- [Terraform Registry: google_storage_bucket_iam_member](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket_iam)
- [Terraform Registry: google_storage_project_service_account (data source)](https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/storage_project_service_account)
- [Terraform Registry: google_kms_crypto_key](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_crypto_key)
- [GCP: Cloud Storage bucket locations](https://cloud.google.com/storage/docs/locations)
- [GCP: Object Lifecycle Management](https://cloud.google.com/storage/docs/lifecycle)
- [GCP: Managing turbo replication](https://cloud.google.com/storage/docs/managing-turbo-replication)
- [GCP: Public access prevention](https://cloud.google.com/storage/docs/public-access-prevention)
- [GCP: Bucket retention policies and Bucket Lock](https://cloud.google.com/storage/docs/bucket-lock)
- [GCP: Soft delete policy](https://cloud.google.com/storage/docs/soft-delete)

## Issues Found
- **Misleading lifecycle rule comment**: The comment above the `num_newer_versions = 3` / `with_state = "ARCHIVED"` lifecycle rule read "Delete non-current versions after 30 days", which inaccurately implied an age-based deletion. The actual rule deletes archived (noncurrent) versions whenever 3+ newer versions exist, regardless of age. Updated the comment to "Keep only the 3 most recent noncurrent versions of each object" to accurately reflect the rule's behavior.

## Review Notes
- All Terraform resource arguments, block names, and attribute names are correct for the hashicorp/google provider v5.x.
- Time conversions verified correct: 604800s = 7 days (soft delete), 220752000s = 7 years (retention), 7776000s = 90 days (KMS rotation).
- The dual-region `custom_placement_config` pattern with `location = "US"` and `data_locations = ["US-CENTRAL1", "US-EAST1"]` is the correct usage per the provider docs.
- The `google_storage_project_service_account` data source uses `email_address` (not `email`) — used correctly in the post.
- `rpo = "ASYNC_TURBO"` is a valid value, and the 15-minute RPO vs. default 12-hour RPO claim matches GCP documentation.
- The `public_access_prevention` accepted values ("enforced", "inherited") are correctly used.
- The post is current as of the hashicorp/google provider v5.x; with v6.x now also available, users should note that the `~> 5.0` pin will not upgrade automatically — but the resource semantics shown remain compatible with v6 at the time of review.
