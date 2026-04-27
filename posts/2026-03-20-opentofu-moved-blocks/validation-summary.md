# Validation Summary: Using moved Blocks in OpenTofu for Safe Refactoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`moved` block, refactoring semantics)
- Terraform-compatible HCL configuration language
- AWS provider resources used as examples (`aws_instance`, `aws_security_group`, `aws_eip`, `aws_iam_user`, `aws_vpc`, `aws_subnet`, `aws_internet_gateway`, `aws_s3_bucket`)
- `tofu` CLI (`tofu plan`)

## Sources Consulted
- OpenTofu refactoring documentation: https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu state addressing / resource address syntax docs
- AWS provider `aws_eip` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- terraform-provider-aws CHANGELOG entry confirming removal of the `vpc` argument from `aws_eip` (replaced by `domain`)

## Issues Found
No technical issues found.

All claims verified against the OpenTofu refactoring docs:
- `moved { from = ...; to = ... }` syntax with no labels is correct.
- Moving a resource into a module via `to = module.app.aws_security_group.app` matches the "Splitting One Module into Multiple" pattern in the docs.
- Renaming an entire module call via `from = module.old_module; to = module.new_module` is supported (the docs' "Renaming a Module Call" section).
- The count-to-for_each migration uses correct address forms: integer indices (`[0]`) for `count` and string keys (`["alice"]`) for `for_each`.
- `aws_eip` correctly uses `domain = "vpc"` — the legacy `vpc = true` argument has been removed from the AWS provider, so the post's example is up to date.
- `tofu plan` is a valid command for the verification step.

## Review Notes
- OpenTofu has supported `moved` blocks since its initial release (1.6), inheriting the feature from Terraform 1.1+. The post does not call out a minimum version, which is fine in practice but could be a future improvement for completeness.
- One OpenTofu-specific caveat (not relevant to any example in this post but worth noting for future expansions): `moved` blocks cannot be used with ephemeral resources, since those are not tracked in state.
- The post does not show what `tofu plan` output looks like during a refactor (the "(moved)" annotation in the plan), which could be a useful future addition but is not a correctness issue.
- Ordering inside a single `moved` block is significant in chains (e.g., A → B → C must be expressed as two `moved` blocks). The post does not get into chain refactors, so this is informational only.
