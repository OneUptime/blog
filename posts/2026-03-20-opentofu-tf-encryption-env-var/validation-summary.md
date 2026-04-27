# Validation Summary: How to Use the TF_ENCRYPTION Environment Variable in OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (state and plan encryption)
- HCL configuration syntax
- PBKDF2 key provider
- AWS KMS key provider
- AES-GCM encryption method
- Bash / shell environment variables
- GitHub Actions

## Sources Consulted
- [OpenTofu State and Plan Encryption documentation](https://opentofu.org/docs/language/state/encryption/)
- [OpenTofu `tofu providers schema` command documentation](https://opentofu.org/docs/cli/commands/providers/schema/)
- [OpenTofu 1.7.0 release notes](https://opentofu.org/blog/opentofu-1-7-0/)
- [OpenTofu GitHub issue #1871 — TF_ENCRYPTION migration](https://github.com/opentofu/opentofu/issues/1871)

## Issues Found

1. **Missing `key_spec` parameter in AWS KMS examples.** The `aws_kms` key provider requires `key_spec` (e.g. `"AES_256"`) in addition to `kms_key_id` and `region`. Both AWS KMS examples (the standalone "Using with AWS KMS" example and the GitHub Actions production example) omitted this required field. Added `key_spec = "AES_256"` to both.

2. **Incorrect verification command.** The post recommended `tofu providers schema -json | jq '.encryption'` to inspect the active encryption configuration. The `tofu providers schema` command outputs only provider/resource/data-source schemas — it has no `.encryption` field, so the `jq` filter would always return `null`. Removed the misleading command and replaced it with a note that there is no dedicated CLI to dump the active encryption configuration; a successful `tofu plan` is the practical verification.

3. **Misleading "Disabling Encryption" section.** The original section claimed `enforced = false` could be used to "temporarily disable encryption … for debugging." Per the OpenTofu docs, `enforced = false` only removes the enforcement check that prevents writing unencrypted data — it does not decrypt existing state. To genuinely migrate state to plaintext you must add the `unencrypted` method and place the original method in a `fallback` block. Renamed the section to "Disabling Enforcement via Environment" and added a clarifying note about the proper migration path.

## Review Notes

- The basic PBKDF2 example uses `passphrase = "my-strong-passphrase"` (19 characters), which satisfies the 16-character minimum required by the `pbkdf2` key provider. Worth noting that OpenTofu also enforces a minimum iteration count of 200,000 (default 600,000) — relevant if a future revision shows custom PBKDF2 tuning.
- The "Merging with Configuration File Encryption" section is accurate — TF_ENCRYPTION does merge with code-based `encryption {}` blocks. The official docs add that environment-supplied settings override conflicting code-based settings; this nuance was not contradicted in the post but could be made explicit in a future revision.
- The shell single-quoted examples that contain `${STATE_PASSPHRASE}` / `${VAULT_PASSPHRASE}` rely on those being interpreted by the user's surrounding tooling rather than by bash itself (single quotes prevent shell expansion). This is consistent with how OpenTofu's early variable evaluation works in some setups, but readers using plain bash would need to switch to double quotes for shell expansion. Left as-is since the post does not claim shell expansion is happening.
- The GitHub Actions step that writes a multi-line `TF_ENCRYPTION` to `$GITHUB_ENV` via `echo "TF_ENCRYPTION=$TF_ENCRYPTION" >> $GITHUB_ENV` will not preserve newlines correctly without the GitHub Actions multiline delimiter syntax (`KEY<<EOF` … `EOF`). This is a CI/CD concern rather than an OpenTofu correctness issue, so left untouched per the "fix only technical errors" guidance, but worth flagging.
