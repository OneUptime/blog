# Validation Summary: How to Use Module Version Constraints in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu
- Terraform (HCL syntax, version constraint operators — shared with OpenTofu)
- HCL (HashiCorp Configuration Language)
- Git (as a module source)
- AWS (referenced via terraform-aws-modules registry examples)

## Sources Consulted
- OpenTofu official documentation: https://opentofu.org/docs/language/expressions/version-constraints/
- OpenTofu module source documentation: https://opentofu.org/docs/language/modules/sources/
- OpenTofu dependency lock file documentation: https://opentofu.org/docs/language/files/dependency-lock/
- Terraform version constraint documentation (shared semantics): https://developer.hashicorp.com/terraform/language/expressions/version-constraints

## Issues Found
1. **Incorrect description of pessimistic constraint `~> 1.2` in operators table.** The original table claimed `~> 1.2` "Allows 1.2.x" and `~> 1.2.0` "Only 1.2.x". This is incorrect for `~> 1.2`: that constraint actually allows the rightmost component to increment, meaning it permits >= 1.2, < 2.0 (e.g., 1.2, 1.3, 1.4, ..., up to but not including 2.0). I updated the table to read:
   - `~> 1.2` | Allows >= 1.2, < 2.0
   - `~> 1.2.0` | Allows >= 1.2.0, < 1.3.0

   This matches the official OpenTofu/Terraform pessimistic constraint operator semantics.

## Review Notes
- The example comment `# Allow any 5.x.y version but not 6.x` next to `version = "~> 5.0"` is technically correct: `~> 5.0` allows any 5.x version (with patches) but not 6.0.
- All other operators (`=`, `!=`, `>`, `>=`, `<`, `<=`) and their descriptions are correct.
- Combining constraints with commas (e.g., `">= 4.0, < 6.0, != 5.0.0"`) is valid OpenTofu syntax.
- The claim that the `.terraform.lock.hcl` file does not record module versions (only providers) is correct per the OpenTofu dependency lock file docs.
- Git source syntax (`github.com/owner/repo//subdir?ref=tag-or-sha`) is correct. Note: official examples typically show full 40-character SHA-1 hashes for commit pins, while the post uses a 15-character abbreviated hash. This works but full SHAs are slightly more reproducible; left as-is since the example is illustrative.
- The fully-qualified registry source `registry.opentofu.org/terraform-aws-modules/vpc/aws` works as an explicit hostname-qualified reference. The hostname can be omitted for the public registry, but including it is also valid.
