# Validation Summary: How to Configure State Encryption with GCP KMS in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- OpenTofu state and plan encryption
- Google Cloud KMS
- Google Cloud IAM
- Google Cloud Storage GCS backend
- Google Cloud CLI and Cloud Logging
- Terraform/OpenTofu HCL and the Google Terraform provider

## Sources Consulted
- OpenTofu State and Plan Encryption documentation: https://opentofu.org/docs/v1.11/language/state/encryption/
- OpenTofu 1.7 State and Plan Encryption documentation: https://opentofu.org/docs/v1.7/language/state/encryption/
- OpenTofu GCS backend documentation: https://opentofu.org/docs/language/settings/backends/gcs/
- Google Cloud KMS IAM documentation: https://cloud.google.com/kms/docs/iam
- Google Cloud KMS audit logging documentation: https://cloud.google.com/kms/docs/audit-logging
- Google Cloud KMS key rotation documentation: https://cloud.google.com/kms/docs/rotate-key
- Google Cloud SDK `gcloud kms keys versions create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/versions/create
- Google Cloud authentication service account impersonation documentation: https://docs.cloud.google.com/docs/authentication/use-service-account-impersonation
- Google Cloud Workload Identity Federation documentation: https://docs.cloud.google.com/iam/docs/workload-identity-federation
- Cloud Storage customer-managed encryption keys documentation: https://cloud.google.com/storage/docs/encryption/customer-managed-keys
- Google Terraform provider KMS IAM generated documentation source: https://third-party-mirror.googlesource.com/terraform-provider-google/+/refs/tags/v7.7.0/website/docs/r/google_kms_crypto_key_iam.html.markdown

## Issues Found
- The OpenTofu `gcp_kms` key provider examples omitted the required `key_length` argument. Added `key_length = 32` to the GCP KMS key provider snippets so they are valid for the `aes_gcm` method.
- The KMS key provider comment said the value was a crypto key version, but the configured value is a crypto key resource name. Updated the comment to say crypto key.
- The guide did not mention the required migration pattern for existing unencrypted state. Added a brief note to use an `unencrypted` fallback during the first migration.
- The service account impersonation command was labeled as preferred in CI/CD even though `gcloud auth application-default login --impersonate-service-account` creates a local ADC file. Updated the comments to describe it as local ADC testing and point CI/CD users to Workload Identity Federation or attached service accounts.
- The IAM example mixed `google_kms_crypto_key_iam_binding` with earlier `google_kms_crypto_key_iam_member` usage for the same role. Changed the multi-principal example to non-authoritative `google_kms_crypto_key_iam_member` resources with `for_each` to avoid IAM binding conflicts.
- The GCS backend example used `encryption_key` for CMEK. OpenTofu's GCS backend uses `kms_encryption_key` for Cloud KMS customer-managed encryption keys; updated the field and noted that the key location must match the bucket location.
- The Cloud Audit Logs query used non-existent `EncryptRequest` and `DecryptRequest` method names. Updated the filter to use `Encrypt` and `Decrypt`, added the Cloud KMS service name, and noted that Data Access audit logs must be enabled for those operations.

## Review Notes
- The manual rotation command using `gcloud kms keys versions create --primary` is current according to the Google Cloud SDK reference.
- OpenTofu `>= 1.7.0` is the technical minimum for state encryption, but production users should prefer a currently supported OpenTofu release.
- `tofu` and `gcloud` were not installed in the local environment, so command validation was performed against official documentation rather than local `--help` output.
