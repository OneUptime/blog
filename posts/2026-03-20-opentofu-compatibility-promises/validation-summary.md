# Validation Summary: How to Understand OpenTofu Compatibility Promises

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- OpenTofu (semantic versioning, compatibility commitments)
- HCL (HashiCorp Configuration Language)
- Terraform (compatibility with Terraform 1.x)
- Terraform Plugin SDK / Plugin Framework (provider protocol)
- `.terraform.lock.hcl` dependency lock file
- `tofu` CLI (`state list`, `plan`)

## Sources Consulted
- OpenTofu official documentation: https://opentofu.org/docs/
- OpenTofu compatibility promises: https://opentofu.org/docs/language/v1-compatibility-promises/
- OpenTofu CLI reference: https://opentofu.org/docs/cli/
- Terraform language docs on experiments and `module_variable_optional_attrs` (stabilized in 1.3): https://developer.hashicorp.com/terraform/language/v1.2.x/expressions/type-constraints
- Terraform `required_version` / `required_providers` reference: https://developer.hashicorp.com/terraform/language/settings
- Dependency lock file documentation: https://opentofu.org/docs/language/files/dependency-lock/
- Provider protocol versions (v5 and v6) reference

## Issues Found
No technical issues found.

The post's claims align with OpenTofu's published compatibility promises:
- Semantic versioning (MAJOR.MINOR.PATCH) and the meaning of each bump are accurately described.
- HCL stability within a major version is a genuine OpenTofu commitment.
- State format auto-migration on first use is correct behavior.
- `module_variable_optional_attrs` was indeed an experiment that became stable in Terraform 1.3, with the syntax shown (unquoted identifier inside `experiments = [...]`).
- `tofu state list` and `tofu plan` are valid commands.
- `.terraform.lock.hcl` is the correct lock-file filename and is intended to be committed to version control.
- Provider source `hashicorp/aws` with `version = "~> 5.0"` is a real, currently available provider/version constraint.
- OpenTofu's commitment to supporting providers built on the Terraform Plugin SDK / Plugin Framework via the existing provider protocol (v5/v6) is accurately stated.
- The HCL `for` expression `for k, v in var.tags : k => v` is syntactically valid.
- Versions referenced (1.8.0, 1.9.0, 1.10.0) are all real OpenTofu releases.

## Review Notes
- The "Testing Against Compatibility Promises" code block is labeled as `bash` but contains both an HCL `terraform {}` block and a YAML CI matrix snippet. This is illustrative rather than runnable as a single shell script; it is not technically wrong, just stylistically mixed. Not changed since it does not affect correctness.
- The phrase "Hash algorithms in lock files are guaranteed to remain valid" is a reasonable summary of OpenTofu's stance — existing `h1:` and `zh:` hashes continue to be validatable across versions, and any future hash scheme additions are additive.
- Post-fork, OpenTofu generally tracks Terraform 1.5.x feature parity and adds its own features beyond that. The blanket statement "OpenTofu maintains compatibility with Terraform 1.x configurations" is accurate at the configuration-language level for the features both projects share, which matches the post's framing.
- No version-specific caveats that would invalidate the post as of 2026-04-28.
