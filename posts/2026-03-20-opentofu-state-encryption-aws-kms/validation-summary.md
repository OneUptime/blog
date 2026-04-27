# Validation Summary: How to Configure State Encryption with AWS KMS in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (state encryption, introduced in 1.7.0)
- Terraform configuration language (HCL)
- AWS KMS (Key Management Service)
- AWS IAM (policies for KMS access)
- AWS S3 (state backend)
- AES-GCM envelope encryption

## Sources Consulted
- OpenTofu State Encryption documentation: https://opentofu.org/docs/language/state/encryption/
- OpenTofu 1.7.0 release notes (state encryption introduction)
- AWS KMS documentation for `kms_key_id` formats (ARN, alias, multi-region key)
- AWS KMS API reference for `GenerateDataKey` and `Decrypt` actions

## Issues Found

1. **Missing required `key_spec` field in the `aws_kms` key_provider block.** The OpenTofu `aws_kms` key provider requires three fields: `kms_key_id`, `region`, and `key_spec`. Without `key_spec`, OpenTofu cannot generate a data key of the correct size for the `aes_gcm` method. The official docs show `key_spec = "AES_256"` for use with AES-GCM. Fixed by adding `key_spec = "AES_256"` to all three `aws_kms` key_provider blocks in the post (the main configuration, the "Using Key Alias" example, and the "Cross-Region Key Configuration" example).

## Review Notes

- The `encryption {}` block placement inside `terraform { ... }` is correct per official OpenTofu docs.
- `keys = key_provider.aws_kms.main` and `method = method.aes_gcm.main` reference syntax is correct.
- The IAM permissions (`kms:GenerateDataKey` + `kms:Decrypt`) are correct and minimal for envelope encryption — `kms:Encrypt` is intentionally not needed because the data key (returned by `GenerateDataKey`) does the encryption locally via AES-GCM.
- All three `kms_key_id` formats demonstrated (full ARN, alias, multi-region key ID `mrk-...`) are valid inputs to AWS KMS.
- `required_version = ">= 1.7"` is accurate; state encryption shipped in OpenTofu 1.7.0.
- The `# Note: encrypt=true is S3 SSE; the encryption block above is client-side` comment correctly distinguishes the two encryption layers.
