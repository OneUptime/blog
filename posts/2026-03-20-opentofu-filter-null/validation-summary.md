# Validation Summary: How to Filter Null Values from Collections in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HCL language, built-in functions)
- Terraform (compatible HCL syntax)
- AWS Provider resources (`aws_instance`, `aws_security_group`, `aws_ecs_task_definition`, `aws_wafv2_web_acl`, `aws_shield_protection`, `aws_lb`)
- AWS data sources (`aws_instances`, `aws_instance`, `aws_ami`)
- Built-in functions: `compact()`, `concat()`, `merge()`, `try()`, `jsonencode()`, `toset()`, `values()`, `length()`
- HCL `for` expressions, splat operator, conditional expressions, and `optional()` object attribute modifier

## Sources Consulted
- OpenTofu `compact` function: https://opentofu.org/docs/language/functions/compact/
- OpenTofu `try` function: https://opentofu.org/docs/language/functions/try/
- OpenTofu `concat` function: https://opentofu.org/docs/language/functions/concat/
- OpenTofu `merge` function: https://opentofu.org/docs/language/functions/merge/
- OpenTofu `for` expressions: https://opentofu.org/docs/language/expressions/for/
- OpenTofu splat expressions: https://opentofu.org/docs/language/expressions/splat/
- OpenTofu type constraints (`optional()`): https://opentofu.org/docs/language/expressions/type-constraints/#optional-object-type-attributes
- AWS provider `aws_instance` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/instance
- AWS provider `aws_wafv2_web_acl` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- AWS provider `aws_shield_protection` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/shield_protection

## Issues Found
No technical issues found. All function descriptions, HCL syntax, and AWS resource/data source attribute usages are accurate:

- `compact()` correctly described as removing both null and empty-string elements from a list of strings.
- `try()` correctly described as returning the first non-erroring expression.
- `for ... if value != null` is valid HCL syntax for filtering both lists and maps.
- `optional()` in object type constraints is supported (Terraform 1.3+, OpenTofu 1.6+).
- `aws_instance` data source attributes `instance_state` and `private_ip` are valid.
- `aws_wafv2_web_acl` `default_action`/`visibility_config` blocks are structured correctly.
- `aws_shield_protection` required arguments `name` and `resource_arn` are present.
- `values(map)[*].attr` splat expression is a valid way to extract an attribute across map values.
- `merge()` later-key-wins semantics are correctly assumed by `merge(required_tags, optional_tags)`.
- `concat()` accepts heterogeneous list/tuple inputs (including a `[null]` tuple), and the subsequent `for ... if cidr != null` filter correctly removes the null elements.

## Review Notes
- The example in "Filter Nulls from a List" uses `var.enable_vpn ? [var.vpn_cidr] : [null]`. A more idiomatic alternative is `var.enable_vpn ? [var.vpn_cidr] : []` (empty list when disabled), but the post deliberately demonstrates the null-filtering pattern, so the existing form is intentional and correct.
- `aws_wafv2_web_acl.name` is technically optional (it conflicts with `name_prefix`), but the post correctly provides a name value, so this is not an error.
- The "Filter Nulls from a List" example references `aws_security_group.monitoring`, `aws_security_group.vpn`, and `aws_security_group.bastion` without showing them being conditionally created. In a fully realized configuration, those resources would typically use `count` and the references would use `try(aws_security_group.monitoring[0].id, null)`, but the snippet is a valid illustration of the filtering pattern in isolation.
- The post relies on `optional()` in object types, which is only supported in OpenTofu 1.6+ / Terraform 1.3+. Readers on older versions would need to adjust.
