# Validation Summary: How to Create GCP KMS Keyrings and Keys with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud KMS
- Google Cloud Storage CMEK
- Google Cloud IAM
- OpenTofu
- HCL

## Sources Consulted
- [Cloud KMS locations](https://cloud.google.com/kms/docs/locations)
- [Key purposes and algorithms](https://cloud.google.com/kms/docs/algorithms)
- [Create a key](https://cloud.google.com/kms/docs/create-key)
- [Cloud KMS roles and permissions](https://cloud.google.com/iam/docs/roles-permissions/cloudkms)
- [Use customer-managed encryption keys with Cloud Storage](https://cloud.google.com/storage/docs/encryption/using-customer-managed-keys)
- [About Cloud Storage buckets](https://cloud.google.com/storage/docs/buckets)
- [Google provider: `google_kms_key_ring`](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/kms_key_ring.html.markdown)
- [Google provider: `google_kms_crypto_key`](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/kms_crypto_key.html.markdown)
- [Google provider: `google_kms_crypto_key_iam`](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/google_kms_crypto_key_iam.html.markdown)
- [Google provider: `google_storage_bucket`](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/storage_bucket.html.markdown)

## Issues Found
- The key ring location comment implied a simpler regional-or-global model than the current docs. I corrected it to reflect the CMEK same-location requirement and clarified that `global` is a multi-region option for distributed workloads.
- The Cloud Storage example used a fixed bucket name. Cloud Storage bucket names must be globally unique, so I changed it to `${var.project_id}-cmek-protected-bucket`.
- The CMEK bucket example relied on implicit provider project selection and did not state the same-location requirement. I added `project = var.project_id` and clarified the location rule in the code comment and summary text.

## Review Notes
- The IAM examples assume `google_service_account.app_sa`, `google_service_account.ci_sa`, `var.project_id`, and `var.project_number` are defined elsewhere in the OpenTofu configuration.
- `google_kms_key_ring` resources are removed from state but not deleted from Google Cloud when destroyed through the provider, and destroying a `google_kms_crypto_key` can render encrypted data unrecoverable. The post already mitigates that risk for the symmetric key with `prevent_destroy`.
