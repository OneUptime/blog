# Validation Summary: How to Upgrade OpenTofu from 1.6 to 1.7

## Status
validated

## Post Type
Tutorial / Upgrade Guide

## Technologies Covered
- OpenTofu 1.6 / 1.7
- tofuenv (version manager)
- HCL configuration syntax
- OpenTofu state encryption (pbkdf2 key provider, aes_gcm method)
- Terraform/OpenTofu CLI (`tofu init`, `tofu plan`, `tofu validate`)

## Sources Consulted
- OpenTofu 1.7.0 release notes: https://github.com/opentofu/opentofu/releases/tag/v1.7.0
- OpenTofu 1.7 "What's New" docs: https://opentofu.org/docs/v1.7/intro/whats-new/
- OpenTofu state encryption docs (pbkdf2 + aes_gcm syntax)
- tofuenv README (install/use commands and `latest:^` regex syntax)

## Issues Found
- **Incorrect feature attribution: "Early variable evaluation"** — The post listed early variable evaluation as a 1.7 feature in both the introduction paragraph and the "What's New in OpenTofu 1.7" bullet list. This is a 1.8 feature, not 1.7. Removed the mention from the intro and replaced it with client-side state encryption (which is a flagship 1.7 feature). Replaced the bullet with two actual 1.7 features: the `removed` block and loopable `import` blocks.
- **Misleading wording: "improved provider-defined functions"** — Provider-defined functions were *introduced* in 1.7, not improved. Updated the intro wording to drop "improved".

## Review Notes
- The state encryption HCL example uses correct OpenTofu 1.7 syntax: the `encryption` block lives inside `terraform {}`, the `pbkdf2` key provider only requires `passphrase` (other fields like `key_length`, `iterations`, `salt_length`, `hash_function` have defaults), and `method "aes_gcm"` references the key provider via `keys = key_provider.pbkdf2.<name>`.
- The binary download URL pattern (`https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_amd64.zip`) matches OpenTofu's actual release asset naming.
- `tofuenv install latest:^1.7` uses tofuenv's documented regex syntax and is correct.
- The `terraform { ... }` block (rather than a hypothetical `tofu { ... }` block) is intentional and correct — OpenTofu retains the `terraform` block name for backward compatibility.
- Showing two `required_version` lines in the same `terraform` block (Step 3) is illustrative; in real usage only one would be set. The author's "# Or allow a range" comment makes that clear, so left as-is.
