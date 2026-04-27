# Validation Summary: How to Handle Optional Module Features with Conditionals in OpenTofu

## Status
validated

## Post Type
Tutorial / Design Pattern Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- `optional()` type constraint (Terraform 1.3+ / OpenTofu)
- AWS provider resources: `aws_wafv2_web_acl`, `aws_wafv2_web_acl_association`, `aws_db_instance`, `aws_cloudfront_distribution`, `aws_lb`
- Module composition patterns and feature flags

## Sources Consulted
- OpenTofu language documentation — Type Constraints / Optional Object Attributes: https://opentofu.org/docs/language/expressions/type-constraints/
- Terraform language docs — Optional Object Type Attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints#optional-object-type-attributes
- AWS provider — `aws_wafv2_web_acl`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- AWS provider — `aws_wafv2_web_acl_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl_association
- AWS provider — `aws_db_instance` (read replicas via `replicate_source_db`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider — `aws_cloudfront_distribution` (`domain_name` attribute): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution

## Issues Found
No technical issues found.

## Review Notes
- The `optional(bool, false)` and `optional(number, 1)` syntax with default values is correct and matches the OpenTofu/Terraform 1.3+ language spec.
- The `aws_wafv2_web_acl` resource includes all required arguments (`name`, `scope`, `default_action`, `visibility_config`) and the `default_action { allow {} }` block syntax is valid.
- The conditional `count` pattern combined with `[0]` index access on referenced resources is the standard idiom and is safe here because both the WAF ACL and its association share the same conditional, so the index reference only evaluates when the resource exists.
- The `enable_shield` field is declared in the `features` object but never consumed by a resource in the snippets. This is harmless given the post's intent (showing the variable shape) but readers extending the example should remember to wire it up to a `aws_shield_protection` resource.
- The `module "cdn"` block uses an `enabled` argument; this works only if the referenced sub-module declares such a variable and uses it internally to gate its resources — that is conventional but worth noting since OpenTofu/Terraform itself does not provide a built-in `enabled` parameter on modules.
