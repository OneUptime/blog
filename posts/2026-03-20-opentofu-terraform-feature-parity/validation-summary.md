# Validation Summary: OpenTofu vs Terraform: Feature Parity and Differences

## Status
validated

## Post Type
Reference / Comparison guide

## Technologies Covered
- OpenTofu (versions 1.6.x through 1.11.x)
- Terraform (versions ≤ 1.5.7 shared codebase, plus 1.6+ post-fork)
- HCL (HashiCorp Configuration Language)
- AWS provider (used in examples — `aws_db_instance`, `aws_s3_bucket`, `aws_instance`, etc.)
- State file format (v4)
- State encryption (PBKDF2 key provider, AES-GCM method)
- Import blocks, moved blocks, check blocks, dynamic blocks

## Sources Consulted
- [OpenTofu 1.7.0 release announcement](https://opentofu.org/blog/opentofu-1-7-0/) — confirmed state encryption and loopable import blocks shipped in 1.7
- [OpenTofu 1.8.0 release announcement](https://opentofu.org/blog/opentofu-1-8-0/) — confirmed 1.8 features (early evaluation, `.tofu` extension, provider mocking) — not provider iteration or state encryption
- [OpenTofu 1.9.0 release announcement](https://opentofu.org/blog/opentofu-1-9-0/) — confirmed provider iteration (`for_each` on providers) shipped in 1.9
- [OpenTofu 1.10.0 release announcement](https://opentofu.org/blog/opentofu-1-10-0/) — confirmed 1.10 features (OCI, S3 locking, deprecation, external key providers); did NOT include write-only attributes
- [OpenTofu 1.11.0 release announcement](https://opentofu.org/blog/opentofu-1-11-0/) — confirmed write-only attributes and ephemeral resources shipped in 1.11
- [OpenTofu state encryption docs](https://opentofu.org/docs/language/state/encryption/) — verified `terraform { encryption { ... } }` block syntax with `key_provider`, `method`, and `state` blocks
- [OpenTofu provider configuration docs](https://opentofu.org/docs/language/providers/configuration/) — verified `for_each` provider iteration syntax
- AWS provider documentation for `aws_db_instance` — confirmed write-only attribute is `password_wo` with paired `password_wo_version`
- Terraform changelog (HashiCorp) — confirmed Terraform 1.7 added `for_each` import blocks and Terraform 1.11 added write-only arguments / ephemeral resources

## Issues Found

1. **Provider Iteration version was wrong.** The post claimed OpenTofu 1.8+. Provider iteration (`for_each` on `provider` blocks) actually shipped in OpenTofu 1.9.0 (January 2025). Updated heading to "Provider Iteration (OpenTofu 1.9+)".

2. **State Encryption version was wrong.** The post claimed OpenTofu 1.8+. Native state encryption shipped in OpenTofu 1.7.0 (May 2024). Updated heading to "Native State Encryption (OpenTofu 1.7+)".

3. **Write-Only Attributes version was wrong.** The post claimed OpenTofu 1.10+. Write-only attributes shipped in OpenTofu 1.11.0 (December 2025), alongside ephemeral resources. OpenTofu 1.10 contained OCI registry support, native S3 state locking, deprecation marks, and external key providers — but not write-only attributes. Updated heading to "Write-Only Attributes (OpenTofu 1.11+)".

4. **Write-Only Attribute argument name was wrong.** The example showed `password = var.db_password` and claimed it was write-only. The AWS provider's actual write-only argument is `password_wo`, paired with `password_wo_version` to trigger updates. Updated example to use `password_wo` and `password_wo_version`, and added a one-line explanation of the `_wo` suffix convention.

5. **"OpenTofu-Exclusive" section heading was inaccurate.** Loopable import blocks are also in Terraform 1.7+, and write-only attributes / ephemeral resources are also in Terraform 1.11+. Renamed section to "Notable OpenTofu Features" and added "Also available in Terraform X.Y+" notes under the two non-exclusive features. The conclusion paragraph was also updated to reflect this nuance.

6. **Version alignment table was wrong on multiple counts.**
   - 1.7.x listed only "Loopable import blocks" — was missing state encryption (the headline 1.7 feature), provider-defined functions, and removed blocks.
   - 1.8.x listed "Provider iteration, native state encryption" — both belong to other versions (1.9 and 1.7). The actual 1.8 features are early variable/locals evaluation, `.tofu` extension, and provider mocking.
   - 1.9.x listed "Variable validation improvements" — actual 1.9 headline is provider iteration with `for_each` and the `-exclude` flag.
   - 1.10.x listed "Write-only attributes, ephemeral resources" — actual 1.10 features are OCI registry support, native S3 state locking, deprecation marks, and external key providers.
   - "N/A" in the Terraform Equivalent column was wrong — Terraform has continued shipping 1.6 through 1.11+ with overlapping features; replaced with approximate version mappings.
   - Added a 1.11.x row for write-only attributes and ephemeral resources.

7. **State file path in verification command was misleading.** The post showed `cat .terraform/terraform.tfstate | jq '.version'`. The actual state file with format version 4 is `terraform.tfstate` in the working directory; `.terraform/terraform.tfstate` is a backend metadata stub. Updated the path to `terraform.tfstate`.

## Review Notes

- The check-block example uses a scoped `data` block inside `check`, which is correct for both OpenTofu and Terraform 1.5+.
- The state encryption HCL syntax (`terraform { encryption { key_provider … method … state … } }`) was verified against current OpenTofu docs and is correct.
- The post uses "BSL" and "BUSL" interchangeably for HashiCorp's Business Source License v1.1. Both are common abbreviations; left as-is.
- The introduction's claim that OpenTofu forked from Terraform 1.5.7 in 2023 is accurate (announced August 2023, first GA release January 2024).
- The "Cloud workspaces" row in the Terraform-Exclusive table is somewhat ambiguous — Terraform CLI itself supports `terraform.workspace` and `cloud { ... }` blocks; what's actually exclusive is HCP Terraform's hosted workspace product. This is a minor wording issue, not a technical error, so left as-is.
- Sentinel is HashiCorp Cloud / Enterprise only and OPA is a reasonable open-source alternative; row is accurate at the level of detail provided.
