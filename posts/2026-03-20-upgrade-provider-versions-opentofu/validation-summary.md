# Validation Summary: How to Upgrade Provider Versions in OpenTofu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- OpenTofu (CLI: `tofu`)
- Terraform HCL / `required_providers` blocks
- `.terraform.lock.hcl` lock file
- AWS Terraform/OpenTofu provider (hashicorp/aws)
- Renovate (dependency update bot)
- jq, bash

## Sources Consulted
- OpenTofu CLI docs — https://opentofu.org/docs/cli/commands/
- OpenTofu `providers schema` docs — https://opentofu.org/docs/cli/commands/providers/schema/
- OpenTofu `init -upgrade` docs — https://opentofu.org/docs/cli/commands/init/
- Terraform `required_providers` version constraint syntax — https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- AWS Provider v4.0 upgrade guide (S3 sub-resource split) — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-4-upgrade
- AWS Provider v5.0 upgrade guide — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-5-upgrade
- Renovate `config:recommended` preset docs — https://docs.renovatebot.com/presets-config/
- Renovate `matchPackageNames` docs (regex/glob syntax) — https://docs.renovatebot.com/configuration-options/#matchpackagenames

## Issues Found

1. **Renovate preset `config:base` is deprecated.** The post used `"extends": ["config:base"]`. This preset was renamed to `config:recommended` around Renovate v37 (late 2023). Updated to `config:recommended`.

2. **Renovate `matchPackagePatterns` is deprecated.** The post used `"matchPackagePatterns": [".*"]`. This field was consolidated into `matchPackageNames`, which now accepts regex in slash-delimited form. Updated to `"matchPackageNames": ["/.*/"]`.

3. **Incorrect AWS provider version history for S3 ACL split.** The "Handling Breaking Changes" section claimed the S3 bucket ACL split from inline attribute to `aws_s3_bucket_acl` resource happened between AWS provider 4.x and 5.x. In reality the split was introduced in provider v4.0 (inline `acl` deprecated there), and in v5.x the inline attributes remain deprecated but functional — they have not been removed. The first example also mislabeled `vpc_security_group_ids` as an "old attribute name" even though it is the current name. Rewrote the example to accurately show the 3.x → 4.x+ transition with a correct note that inline attributes are deprecated and pending removal in a future major version.

## Review Notes

- All OpenTofu commands used (`tofu providers`, `tofu init -upgrade`, `tofu plan`, `tofu show -json`, `tofu workspace select`, `tofu apply`) are valid and current.
- OpenTofu continues to honor the `terraform {}` configuration block for cross-compatibility with Terraform; the `required_providers` snippets are correct.
- Version constraint syntax (`~> 5.0`, `= 5.39.0`, exact pins) is correct per HCL version constraint rules.
- `.terraform.lock.hcl` is the correct lock file name used by OpenTofu (same as Terraform).
- The AWS provider versions cited (`5.45.0`, `5.39.0`) are plausible real 5.x releases; they are illustrative and not required to match any specific real release for the post to be accurate.
- Minor style nit (not fixed, out of scope): `cat file | grep ...` is a useless use of cat; `grep ... file` would be cleaner. Functionally identical.
