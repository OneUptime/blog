# Validation Summary: How to Use Version Constraints in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (required_version, tofu CLI)
- HCL (HashiCorp Configuration Language)
- Terraform-compatible provider/module version constraint syntax
- `.terraform.lock.hcl` dependency lock file
- Semantic versioning

## Sources Consulted
- OpenTofu documentation on version constraints: https://opentofu.org/docs/language/expressions/version-constraints/
- OpenTofu documentation on `required_providers`: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu CLI reference for `tofu init`: https://opentofu.org/docs/cli/commands/init/
- OpenTofu dependency lock file docs: https://opentofu.org/docs/language/files/dependency-lock/
- Terraform version constraint docs (equivalent semantics): https://developer.hashicorp.com/terraform/language/expressions/version-constraints

## Issues Found
1. **Incorrect description of `~> 1.2` in Version Constraint Operators section.** The comment originally read `# Allows 1.2.x, not 1.3.0 or higher`, which is wrong. The pessimistic operator `~> 1.2` permits the rightmost component to increment, so it is equivalent to `>= 1.2.0, < 2.0.0` (it allows 1.3.0, 1.4.0, etc.). This also contradicted the correct explanation in the following "Pessimistic Constraint Explained" section. Updated both comments in that snippet to show the correct expanded ranges (`>= 1.2.0, < 2.0.0` for `~> 1.2` and `>= 1.2.3, < 1.3.0` for `~> 1.2.3`).

2. **Incorrect label "(dry run)" on `tofu init -upgrade`.** The `-upgrade` flag actually performs the upgrade by re-resolving providers and modules to the newest versions matching constraints and rewriting the lock file — it is not a dry run. Updated the comment to `# Upgrade providers to latest versions matching constraints`.

## Review Notes
- The `terraform { ... }` block (rather than `tofu { ... }`) is used throughout. This is fully supported by OpenTofu for backward compatibility and is the conventional choice for cross-compatible configurations.
- The "OpenTofu Version Constraint" snippet lists three `required_version` attributes inside a single `terraform` block. These are clearly presented as mutually exclusive alternatives via comments, but the block as-written would fail HCL parsing if copy-pasted verbatim (duplicate attribute). The intent is clear from context, so no change made per the "only fix technical errors" scope — a future edit could comment out two of the three for cleanliness.
- Pre-release constraints like `= 0.1.0-beta.3` work, but note that pessimistic/range constraints normally exclude pre-release versions unless explicitly matched — the exact-pin usage shown here is correct.
- The shorthand provider source `hashicorp/aws` resolves via OpenTofu's default registry (`registry.opentofu.org/hashicorp/aws`), which is consistent with the example lock file output shown.
