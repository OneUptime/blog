# Validation Summary: How to Use the compact Function in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (HCL configuration language)
- Terraform-compatible built-in functions (`compact`)
- AWS provider resources (`aws_security_group_rule`, `aws_security_group`)
- `tofu console` CLI

## Sources Consulted
- OpenTofu official `compact` function documentation: https://opentofu.org/docs/language/functions/compact/
- OpenTofu CLI reference for `tofu console`
- Terraform AWS provider reference for `aws_security_group_rule`

## Issues Found
No technical issues found.

The post correctly states that `compact`:
- Accepts a `list(string)`
- Removes both empty string (`""`) and `null` elements
- Returns a new list with only the non-empty / non-null values

The basic example `compact(["a", "", "b", null, "c"]) => ["a", "b", "c"]` matches the official documentation example verbatim. The other example outputs (`compact(["", null, ""]) => []`, `compact(["a", "", "b", ""]) => ["a", "b"]`, `compact(["", null]) => []`) are all consistent with the documented behavior.

The HCL syntax in the practical examples (variables, locals, outputs, ternary expressions, `aws_security_group_rule` resource attributes) is valid. The `tofu console` interactive command is the correct OpenTofu CLI invocation.

## Review Notes
- The post does not specify a minimum OpenTofu version. Null handling in `compact` was added in Terraform 0.15+ and is present in all OpenTofu releases, so this is not a practical concern, but readers using extremely old Terraform versions should be aware that pre-0.15 Terraform errored on `null` inputs to `compact`.
- The `aws_security_group_rule` resource referenced in the example is being superseded in newer AWS provider versions by `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule`, but `aws_security_group_rule` is still supported and the snippet remains valid. This is informational only and not an error in the post.
