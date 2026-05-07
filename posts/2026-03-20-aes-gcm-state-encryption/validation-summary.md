# Validation Summary: How to Use AES-GCM Encryption Method for State in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL / OpenTofu configuration
- AES-GCM
- PBKDF2
- AWS KMS
- OpenTofu CLI

## Sources Consulted
- OpenTofu state and plan encryption docs: https://opentofu.org/docs/v1.11/language/state/encryption/
- OpenTofu CLI docs for `tofu state list`: https://opentofu.org/docs/cli/commands/state/list/
- OpenTofu CLI docs for `tofu show`: https://opentofu.org/docs/cli/commands/show/
- OpenTofu source for AES-GCM method config: https://github.com/opentofu/opentofu/blob/v1.11.6/internal/encryption/method/aesgcm/config.go
- OpenTofu source for AES-GCM method behavior and AAD notes: https://github.com/opentofu/opentofu/blob/v1.11.6/internal/encryption/method/aesgcm/README.md
- OpenTofu source for encrypted payload structure and migration behavior: https://github.com/opentofu/opentofu/blob/v1.11.6/internal/encryption/base.go
- OpenTofu source for AWS KMS key provider validation: https://github.com/opentofu/opentofu/blob/v1.11.6/internal/encryption/keyprovider/aws_kms/config.go
- NIST SP 800-38D (GCM): https://csrc.nist.gov/pubs/sp/800/38/d/final
- AWS KMS `GenerateDataKey` API reference: https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html
- Go `crypto/aes` package docs: https://pkg.go.dev/crypto/aes

## Issues Found
- The `aad` example used a string literal, but OpenTofu's AES-GCM method decodes `aad` as bytes. I changed the example to a byte array format.
- The AWS KMS section implied 256-bit data keys are the default. OpenTofu requires an explicit `key_spec`, so I changed the wording to describe `AES_256` as an explicit request.
- The `enforced` section incorrectly stated that `enforced = true` is the default and that `enforced = false` alone allows reading unencrypted state. I corrected this to match OpenTofu's documented migration flow using the `unencrypted` method plus `fallback`, and clarified that `enforced` is an optional safeguard.
- The encryption-process section described all key providers as generating or retrieving a data key. I generalized this to deriving, generating, or retrieving key material, which matches both PBKDF2 and KMS-backed providers.
- The verification section described the on-disk state as binary/base64. OpenTofu stores an encrypted JSON wrapper with metadata and encrypted payload, so I removed the incorrect format claim.
- The performance section contained fixed benchmark-style numbers not supported by official documentation. I replaced them with accurate, configuration-dependent guidance and OpenTofu's documented key-saturation warning.

## Review Notes
- OpenTofu's user-facing encryption docs do not prominently document the `aad` option, but the official source code and tests show that it is supported for `aes_gcm` and is decoded as bytes.
