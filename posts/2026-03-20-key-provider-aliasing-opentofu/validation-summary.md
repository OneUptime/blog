# Validation Summary: How to Use Key Provider Aliasing in OpenTofu State Encryption

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- OpenTofu state and plan encryption
- HCL configuration language
- AWS KMS key providers
- AWS KMS multi-Region keys
- PBKDF2 key providers
- AES-GCM encryption method

## Sources Consulted
- [OpenTofu State and Plan Encryption documentation](https://opentofu.org/docs/v1.11/language/state/encryption/)
- [OpenTofu JSON Configuration Syntax documentation](https://opentofu.org/docs/language/syntax/json/)
- [OpenTofu 1.9 release notes: `encrypted_metadata_alias`](https://opentofu.org/docs/v1.9/intro/whats-new/)
- [AWS KMS multi-Region keys overview](https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html)
- [AWS KMS aliases documentation](https://docs.aws.amazon.com/kms/latest/developerguide/kms-alias.html)

## Issues Found
1. The opening syntax example used PBKDF2 passphrases shorter than OpenTofu's documented 16-character minimum, and the `aws_kms` examples omitted the required `key_spec` setting. I replaced the short passphrases with compliant examples and expanded the KMS examples to include `region` and `key_spec = "AES_256"` so the snippets match the documented provider requirements.
2. Pattern 1 and Pattern 5 used conditional expressions directly in `state.method`. OpenTofu's encryption config only allows `state`, `plan`, and `remote_state_data_sources` to reference `method` blocks there, not arbitrary expressions. I moved the environment selection into the `method "aes_gcm"` block's `keys` expression and kept `state.method` as a static method reference.
3. Pattern 3 implied a generic multi-region fallback between two AWS KMS providers. That only works for cross-region decrypt/recovery when the keys are compatible AWS KMS multi-Region replicas with shared key material. I clarified the text and comments to make that requirement explicit, and added the missing `key_spec` fields.

## Review Notes
- No CLI commands were present in the post, so the review focused on HCL configuration correctness and the behavior described in the OpenTofu and AWS KMS documentation.
- The post is now technically consistent with current OpenTofu encryption documentation.
- OpenTofu stores key provider metadata with encrypted state. If a future revision discusses renaming aliases after encryption is already in use, it should mention the docs warning about renaming providers/methods and the `encrypted_metadata_alias` option introduced for that case.
- The `tofu` binary was not available in the workspace, so validation was documentation-based rather than backed by local command execution.
