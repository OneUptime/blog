# Validation Summary: How to Debug For Each and Count Index Issues in OpenTofu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- OpenTofu (HCL configuration language)
- `for_each` and `count` meta-arguments
- `tofu state mv` CLI command
- AWS provider resources (aws_instance, aws_subnet, aws_vpc, aws_security_group)
- Built-in functions: `toset()`, `length()`, `cidrsubnet()`

## Sources Consulted
- OpenTofu documentation on count: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu documentation on for_each: https://opentofu.org/docs/language/meta-arguments/for_each/
- OpenTofu CLI state mv documentation: https://opentofu.org/docs/cli/commands/state/mv/
- Terraform/OpenTofu error message references for "Invalid for_each argument", "Invalid count argument", and "Invalid index"
- AWS provider documentation for aws_instance, aws_subnet, aws_vpc resources
- HCL function references for `toset`, `length`, and `cidrsubnet`

## Issues Found
- **Mismatched error title in Common Errors section**: The third sample error had the title `Index value required` but the body `The given key does not identify an element in this collection value.` — that body text is associated with the `Invalid index` error in OpenTofu/Terraform, not `Index value required` (which is a different error raised when omitting an index on a count-based resource). Updated the title to `Invalid index` to correctly match the body and the scenario described.

## Review Notes
- The `for_each` example using `toset([aws_security_group.app.id])` is a valid demonstration: a new resource's `id` attribute is computed and not known until apply.
- The `count` example using `aws_vpc.main.enable_dns_support` is illustrative — for a brand-new VPC resource being created, computed attributes can be unknown at plan time depending on configuration. The example correctly conveys the principle even if `enable_dns_support` itself is sometimes known at plan time when explicitly set.
- The `tofu state mv` command syntax (with single quotes around resource addresses to escape the brackets and double-quoted keys) is correct for typical shells.
- `cidrsubnet("10.0.0.0/16", 8, count.index)` correctly produces /24 subnets.
- The `each.key` / `each.value` usage with a `map(object(...))` for_each is correct.
- No deprecated APIs or version-specific concerns were identified.
