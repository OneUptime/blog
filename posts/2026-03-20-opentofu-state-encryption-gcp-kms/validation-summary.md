# Validation Summary: How to Configure State Encryption with GCP KMS in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (state encryption, introduced in 1.7)
- Google Cloud KMS (Key Management Service)
- Google Cloud Storage (GCS) backend
- Terraform `google` provider (`google_kms_key_ring`, `google_kms_crypto_key`, `google_kms_crypto_key_iam_member`)
- AES-GCM encryption method
- gcloud CLI / Application Default Credentials / Workload Identity
- Google Cloud Build (CI/CD)

## Sources Consulted
- OpenTofu state encryption docs: https://opentofu.org/docs/language/state/encryption/
- OpenTofu 1.7.0 release announcement: https://opentofu.org/blog/opentofu-1-7-0/
- OpenTofu 1.7.0 release notes: https://github.com/opentofu/opentofu/releases/tag/v1.7.0
- Terraform `google_kms_key_ring` resource docs (registry.terraform.io/providers/hashicorp/google)
- Terraform `google_kms_crypto_key` resource docs
- Terraform `google_kms_crypto_key_iam_member` resource docs
- GCP KMS IAM permissions reference: https://cloud.google.com/kms/docs/reference/permissions-and-roles

## Issues Found
1. **Missing required `key_length` field on `gcp_kms` key provider.** The OpenTofu `gcp_kms` key provider requires both `kms_encryption_key` and `key_length` (number of bytes for the generated data key, valid range 1–1024). The post omitted `key_length` in three configuration examples (the main `versions.tf`, the multi-region key snippet, and the "Encrypting Both State and Plans" snippet). Without this field, OpenTofu will error during `tofu init`. Added `key_length = 32` (32 bytes = AES-256-GCM, matching the post's `aes_gcm` method) to all three blocks.

## Review Notes
- The encryption block placement (inside `terraform { }`), the `aes_gcm` method block, and the `keys = key_provider.gcp_kms.main` reference syntax all match the official OpenTofu spec.
- The `>= 1.7` version constraint correctly reflects when state encryption was introduced.
- The IAM role `roles/cloudkms.cryptoKeyEncrypterDecrypter` is the correct predefined role (grants `cloudkms.cryptoKeyVersions.useToEncrypt` and `useToDecrypt`).
- The 90-day rotation period (`7776000s`) and the `prevent_destroy` lifecycle on the crypto key are sound practices.
- The `hashicorp/opentofu` Cloud Build builder image is illustrative; users may need to confirm a current image is available in their environment, but this is not a technical error.
