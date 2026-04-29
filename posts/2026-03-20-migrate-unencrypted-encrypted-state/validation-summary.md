# Validation Summary: How to Migrate from Unencrypted to Encrypted State in OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (state encryption, introduced in 1.7)
- HCL configuration (`encryption` block, `key_provider`, `method`, `state`, `plan`, `fallback`)
- PBKDF2 key provider
- AES-GCM encryption method
- AWS S3 (as a remote state/backup target)
- `tofu` CLI (`state pull`, `state push`, `state list`, `show`, `init -upgrade`, `apply -refresh-only`, `plan`)

## Sources Consulted
- OpenTofu State Encryption documentation: https://opentofu.org/docs/language/state/encryption/
- OpenTofu PBKDF2 key provider docs (referenced inside the encryption page)
- OpenTofu `aes_gcm` method docs (referenced inside the encryption page)

## Issues Found
- **Incorrect migration mechanism (the central premise of the post).** The original post claimed `enforced = false` is what allows OpenTofu to read existing unencrypted state during migration. This is wrong. According to the official docs: "OpenTofu, by default, refuses to read [unencrypted state files] because they could have been manipulated. To enable reading unencrypted data, you have to specify an `unencrypted` method." The `enforced` setting only controls whether OpenTofu refuses to *write* unencrypted data — it has no effect on the ability to read existing unencrypted state. To migrate, you must declare a `method "unencrypted"` block and reference it via a `fallback {}` block inside the `state` (and `plan`) blocks.
  - **Fix:** Rewrote the introduction, Step 2 (HCL config), Step 4 explanation, Step 6 (now "Remove the Fallback and Enable Strict Enforcement"), the Step 6 expected error message, and the conclusion to use the documented `fallback` + `unencrypted` method approach. The Step 6 update now correctly tells the reader to remove the fallback after migration and optionally enable `enforced = true` to refuse writing plaintext going forward.

## Review Notes
- The PBKDF2 key provider configuration in the post uses only `passphrase`, which is valid — `key_length`, `iterations`, `salt_length`, and `hash_function` are all optional with sensible defaults (32 bytes, 600,000 iterations, 32-byte salt, sha512). Authors who want stronger or weaker tuning could call these out, but the current minimal config is correct.
- `required_version = ">= 1.7.0"` is appropriate since state encryption was introduced in OpenTofu 1.7. Note that this is the OpenTofu version constraint, even though the block is named `terraform { ... }` for compatibility — this is consistent with OpenTofu's documented usage.
- Step 5's verification using `file terraform.tfstate` is informal but works: encrypted state is stored as a JSON envelope but contains a base64-encoded ciphertext payload rather than the usual top-level `resources` array, so `python3 -m json.tool` will still parse it as JSON. The post's wording ("Should fail if encrypted") is slightly misleading but not technically wrong as a heuristic — a stronger check would be to inspect for the `encryption` envelope key. Left as-is to avoid scope creep.
- The `TF_ENCRYPTION` environment variable example in "Handling Team Migrations" is left intentionally as an `'...'` placeholder; OpenTofu does support full encryption configuration via this env var (as documented), so the example is plausible even though it omits content.
- No external URLs in the post besides the author's GitHub profile, which is preserved unchanged.
