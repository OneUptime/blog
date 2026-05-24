# Validation Summary: How to Create GCP KMS Keys with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp Google provider)
- Google Cloud KMS (Key Management Service)
- Cloud HSM
- Google Cloud Storage (CMEK)
- Google BigQuery (CMEK)
- GCP IAM

## Sources Consulted
- Terraform Google provider `google_kms_key_ring`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_key_ring
- Terraform Google provider `google_kms_crypto_key`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_crypto_key
- Terraform Google provider `google_kms_crypto_key_iam_member`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_crypto_key_iam
- Terraform Google provider `google_kms_key_ring_iam_member`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_key_ring_iam
- Terraform Google provider `google_storage_project_service_account` data source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/storage_project_service_account
- Terraform Google provider `google_bigquery_default_service_account` data source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/bigquery_default_service_account
- Terraform Google provider `google_storage_bucket`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Terraform Google provider `google_bigquery_dataset`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_dataset
- GCP KMS algorithms reference: https://cloud.google.com/kms/docs/algorithms
- GCP KMS key purposes: https://cloud.google.com/kms/docs/algorithms#key_purposes
- GCP KMS protection levels: https://cloud.google.com/kms/docs/key-hierarchy
- GCP Cloud HSM (FIPS 140-2 Level 3): https://cloud.google.com/kms/docs/hsm
- GCP KMS IAM roles: https://cloud.google.com/kms/docs/reference/permissions-and-roles
- GCP KMS key destruction: https://cloud.google.com/kms/docs/destroy-restore
- GCP KMS locations (including "global"): https://cloud.google.com/kms/docs/locations

## Issues Found
No technical issues found.

Verification details:
- Terraform resource names, attribute names, and block structures (`version_template`, `lifecycle`, `encryption`, `default_encryption_configuration`) all match the current Google provider.
- Algorithm identifiers `GOOGLE_SYMMETRIC_ENCRYPTION`, `EC_SIGN_P256_SHA256`, and `RSA_DECRYPT_OAEP_2048_SHA256` are valid and paired with the correct `purpose` values (`ENCRYPT_DECRYPT`, `ASYMMETRIC_SIGN`, `ASYMMETRIC_DECRYPT`).
- Protection levels `SOFTWARE` and `HSM` are valid.
- IAM roles `roles/cloudkms.cryptoKeyEncrypterDecrypter`, `roles/cloudkms.cryptoKeyEncrypter`, `roles/cloudkms.viewer`, and `roles/cloudkms.admin` are all valid predefined roles.
- Rotation period math is correct: `7776000s` = 90 days; `2592000s` = 30 days.
- The data source attribute names are correct: `google_storage_project_service_account` exposes `email_address`, while `google_bigquery_default_service_account` exposes `email`.
- The claim that Cloud HSM is FIPS 140-2 Level 3 validated is accurate.
- The "global" location for key rings is valid; regional names used in the `for_each` example are real GCP regions.
- The default `destroy_scheduled_duration` of 24 hours is consistent with the GCP KMS documentation.
- The claim that automatic rotation is only available for symmetric encryption keys is accurate (Terraform/GCP rejects `rotation_period` on asymmetric keys).

## Review Notes
- The post uses `prevent_destroy = true` on every key resource, which is a sound practice but means readers will need to remove this block (and re-apply) before they can ever delete a key, even after scheduling key versions for destruction. This is consistent with the post's stated intent.
- `EC_SIGN_P256_SHA256` is suitable for the example shown; if readers need stronger signing they can switch to `EC_SIGN_P384_SHA384` or `RSA_SIGN_PSS_*` algorithms.
- The post sets `force_destroy = false` on the encrypted bucket, which is correct for production data but means readers experimenting in a sandbox may need to manually empty the bucket before destroying.
- No version pins are shown for the Google provider; the syntax used is compatible with recent 5.x and 6.x releases of `hashicorp/google`.
