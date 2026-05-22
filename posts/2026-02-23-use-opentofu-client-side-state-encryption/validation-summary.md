# Validation Summary: How to Use OpenTofu Client-Side State Encryption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu state and plan encryption
- Terraform/OpenTofu HCL configuration
- AES-GCM encryption
- PBKDF2 key derivation
- AWS KMS
- GCP Cloud KMS
- AWS S3 backend and server-side encryption
- AWS CLI

## Sources Consulted
- OpenTofu State and Plan Encryption documentation: https://opentofu.org/docs/language/state/encryption/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu state pull command documentation: https://opentofu.org/docs/cli/commands/state/pull/
- OpenTofu state encryption design notes: https://github.com/opentofu/opentofu/blob/main/docs/state_encryption.md
- AWS KMS GenerateDataKey API documentation: https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html
- AWS CLI kms describe-key documentation: https://docs.aws.amazon.com/cli/latest/reference/kms/describe-key.html
- Referenced OneUptime CI/CD article: https://oneuptime.com/blog/post/2026-02-23-use-opentofu-with-ci-cd-pipelines/view

## Issues Found
- Server-side encryption was described as data traveling unencrypted to the server. Updated this to state that data travels over TLS and is encrypted by the storage service, matching how S3/GCS/Azure storage encryption is normally used.
- Server-side and client-side access claims were too absolute. Updated the wording to distinguish backend read access, KMS decrypt permissions, and storage-service decryption behavior.
- The encrypted state was described as binary and "not JSON." OpenTofu encrypted state remains a JSON envelope containing encryption metadata and ciphertext, so the example and explanation were corrected.
- The PBKDF2 `hash_function` default was listed as `sha256`. Current OpenTofu documentation lists the default as `sha512`, so the snippet was corrected.
- The AWS KMS provider flow implied OpenTofu locally generates and then wraps the DEK. Updated the explanation to match AWS KMS envelope-encryption behavior using generated data keys.
- The commented AWS KMS assume-role example used deprecated top-level `role_arn`. Updated it to the current `assume_role = { role_arn = ... }` form.
- The GCP KMS `key_length` example used `256`, but OpenTofu expects bytes, not bits. Changed it to `32` for a 256-bit key.
- The migration verification command said encrypted state should not be JSON. Updated it to verify that plaintext state resources are not visible instead.
- The recovery section suggested KMS key deletion protection and implied a KMS key ID alone is enough. Updated it to document the KMS key ID plus break-glass decrypt access and to check `KeyState`/`DeletionDate`.
- The KMS performance note said every state read/write requires a generic KMS API call. Updated it to distinguish data-key calls on writes from decrypt calls on reads.

## Review Notes
OpenTofu was not installed in the local environment, so CLI behavior was verified against official OpenTofu and AWS documentation rather than by running `tofu` commands locally. The post uses `required_version = ">= 1.7.0"`, which is appropriate because state and plan encryption was introduced in OpenTofu 1.7.
