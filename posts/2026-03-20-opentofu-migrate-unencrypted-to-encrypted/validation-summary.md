# Validation Summary: How to Migrate from Unencrypted to Encrypted State in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Step-by-step migration guide

## Technologies Covered
- OpenTofu (1.7+)
- OpenTofu state encryption (`encryption {}` block)
- Key providers: AWS KMS, PBKDF2
- Encryption method: AES-GCM
- AWS S3 backend (for verification example)
- `tofu` CLI (`init`, `apply -refresh-only`, `state pull`, `state push`, `state list`, `plan`)

## Sources Consulted
- [OpenTofu State and Plan Encryption documentation](https://opentofu.org/docs/language/state/encryption/)
- [OpenTofu issue #1365 — Syntax for migrating from unencrypted state/plan](https://github.com/opentofu/opentofu/issues/1365)
- [OpenTofu state_encryption.md (main branch)](https://github.com/opentofu/opentofu/blob/main/docs/state_encryption.md)

## Issues Found
1. **Incorrect migration mechanism (introduction, Step 2, Step 6, PBKDF2 example, conclusion).** The post claimed that setting `enforced = false` alone in the `state` block enables OpenTofu to read existing unencrypted state during migration. This is wrong. Per the official OpenTofu documentation, OpenTofu refuses to read plain-text state by default. To read unencrypted state during migration you must declare a `method "unencrypted" "migrate" {}` and reference it from a `fallback` block inside the `state` block. The `enforced` setting is a separate, optional safeguard that, when `true`, forbids unencrypted reads even if a fallback is defined; setting it to `false` (or omitting it) does not by itself enable reading unencrypted state.

   **What I changed:**
   - Updated the introduction to describe the `fallback` block + `unencrypted` method as the actual mechanism.
   - Rewrote Step 2 ("Add Encryption Configuration with enforced = false" → "Add Encryption Configuration with a Fallback Method") to add a `method "unencrypted" "migrate" {}` declaration and a `fallback { method = method.unencrypted.migrate }` block inside `state`, removing the misleading `enforced = false` line.
   - Rewrote Step 6 to instruct removal of the `fallback` block (and the `unencrypted` method) and optional addition of `enforced = true`, instead of merely flipping `enforced` from `false` to `true`.
   - Updated the PBKDF2 migration example with the same `method "unencrypted" "migrate" {}` + `fallback` pattern.
   - Updated the conclusion to reflect the corrected procedure.

## Review Notes
- `tofu apply -refresh-only` does cause OpenTofu to write state and therefore re-encrypts it during migration, which is correct as written. A plain `tofu apply` works equivalently when there are no resource changes pending.
- The OpenTofu 1.7+ requirement is correct — state encryption was introduced in OpenTofu 1.7 (released May 2024).
- The AES-GCM method and the AWS KMS / PBKDF2 key-provider syntax in the post matches the current OpenTofu schema.
- The Step 5 verification trick (`file /tmp/check-state` returning `data` rather than text/JSON for an encrypted state) is a useful sanity check; readers using non-S3 backends will need to adapt the download command accordingly.
- The rollback plan uses `tofu state push` against an unencrypted backup; this requires that the encryption block be removed from configuration first (as the post indicates) so the push targets an unencrypted backend, which is correct.
