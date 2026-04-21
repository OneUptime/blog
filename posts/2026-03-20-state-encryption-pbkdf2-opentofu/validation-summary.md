# Validation Summary: How to Configure State Encryption with PBKDF2 in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu state and plan encryption
- OpenTofu HCL configuration
- PBKDF2 key provider
- AES-GCM encryption method
- OpenTofu CLI (`tofu init`, `tofu plan`, `tofu apply`, `tofu state list`)
- `TF_VAR_*` and `TF_ENCRYPTION` environment variables

## Sources Consulted
- OpenTofu state and plan encryption documentation: https://opentofu.org/docs/v1.11/language/state/encryption/
- OpenTofu v1.7 state and plan encryption documentation: https://opentofu.org/docs/v1.7/language/state/encryption/
- OpenTofu CLI environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu 1.7.0 release announcement: https://opentofu.org/blog/opentofu-1-7-0/
- NIST SP 800-132, Recommendation for Password-Based Key Derivation: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf
- OpenTofu v1.11.0 CLI help output for `tofu plan`, `tofu apply`, and `tofu state list`

## Issues Found
1. **Passphrase examples below OpenTofu's PBKDF2 minimum length**: The CLI/tfvars examples used `your-passphrase`, and the `TF_ENCRYPTION` example used `my-passphrase`. OpenTofu requires PBKDF2 passphrases to be at least 16 characters. Updated those examples to longer placeholder passphrases so copied commands do not fail.
2. **Missing migration guidance for existing unencrypted state**: The original workflow implied that adding the encryption block and running `tofu apply` would work for existing projects. OpenTofu refuses to read existing plaintext state unless an explicit `unencrypted` fallback is configured during migration. Added a scoped note and HCL snippet showing the temporary `method "unencrypted" "migrate" {}` and `fallback` block, plus the instruction to remove them after migration.
3. **Encrypted local state format described imprecisely**: The verification step said `terraform.tfstate` should show encrypted binary/base64 content and should not be readable as plain JSON. In practice, OpenTofu writes a JSON envelope containing metadata and `encrypted_data`; the state payload is encrypted, but the wrapper is still JSON. Updated the verification comment accordingly.

## Review Notes
- The main `terraform { encryption { ... } }` configuration, `key_provider "pbkdf2"`, `method "aes_gcm"` with `keys`, and `state`/`plan` blocks match the official OpenTofu documentation.
- The `TF_ENCRYPTION` example was validated as HCL syntax with OpenTofu v1.11.0 after correcting the passphrase length.
- The `terraform` block name is correct for OpenTofu configuration, but the encryption block is OpenTofu-specific and should not be presented as compatible with HashiCorp Terraform CLI.
