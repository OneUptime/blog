# Validation Summary: How to Use the OpenTofu Meta-Arguments Quick Reference

## Status
validated

## Post Type
Reference / Quick Reference Guide

## Technologies Covered
- OpenTofu (1.11+)
- HCL (HashiCorp Configuration Language)
- Infrastructure as Code (IaC)
- AWS provider resources used as examples (aws_instance, aws_s3_bucket, aws_security_group_rule, aws_lambda_function, aws_iam_role_policy_attachment, aws_db_instance, aws_shield_protection, aws_lb)

## Sources Consulted
- [OpenTofu — The enabled Meta-Argument (v1.11)](https://opentofu.org/docs/v1.11/language/meta-arguments/enabled/)
- [OpenTofu — The lifecycle Meta-Argument (v1.11)](https://opentofu.org/docs/v1.11/language/meta-arguments/lifecycle/)
- [OpenTofu — Resource Behavior / Lifecycle Customizations (v1.11)](https://opentofu.org/docs/v1.11/language/resources/behavior/)
- [OpenTofu — The Resource provider Meta-Argument](https://opentofu.org/docs/language/meta-arguments/resource-provider/)
- [OpenTofu — The Module providers Meta-Argument](https://opentofu.org/docs/language/meta-arguments/module-providers/)
- [OpenTofu — count Meta-Argument](https://opentofu.org/docs/language/meta-arguments/count/)
- [OpenTofu — depends_on Meta-Argument (source)](https://github.com/opentofu/opentofu/blob/main/website/docs/language/meta-arguments/depends_on.mdx)
- [OpenTofu v1.11.0 release announcement](https://opentofu.org/blog/opentofu-1-11-0/)

## Issues Found

1. **`enabled` shown as a top-level meta-argument** — In the standalone "enabled (OpenTofu 1.11+)" example, `enabled` was placed at the top level of the resource block. According to the official OpenTofu 1.11 documentation, `enabled` is an argument *inside* the `lifecycle` block (alongside `prevent_destroy`, `ignore_changes`, `create_before_destroy`, `replace_triggered_by`, and `precondition`/`postcondition`). Fixed by moving `enabled = ...` inside a `lifecycle { ... }` block in the `aws_shield_protection` example, and adding a clarifying note that it cannot be combined with `count` or `for_each`.

2. **Module example mis-placed `enabled` and combined it with `for_each`** — The "Meta-Arguments on Modules" example put `enabled` at the top level of the module block and also used `for_each` in the same block. This is doubly invalid: (a) `enabled` must live inside `lifecycle`, and (b) `enabled` is mutually exclusive with `count`/`for_each`. Fixed by removing the top-level `enabled` from the `module "monitoring"` example and adding a separate `module "shield"` example showing `lifecycle { enabled = ... }` with an explanatory comment about the mutual-exclusion rule. Also added a note that modules use the plural `providers` map.

3. **Comparison table listed `enabled` as if it were a top-level meta-argument** — Updated the table to show `lifecycle.enabled` (and tightened the `provider`/`providers` row to clarify the resource vs. module distinction).

4. **Summary referred to `enabled` rather than `lifecycle.enabled`** — Updated to `lifecycle.enabled` for consistency with the corrected examples.

## Review Notes

- All other code examples are syntactically and semantically correct against current OpenTofu documentation: `count` with `count.index`, `for_each` with `each.key`/`each.value` over both sets and maps, `depends_on` with a list of resource references, `provider = aws.<alias>` for resources, `providers = { ... }` for modules, and `lifecycle` with `prevent_destroy`, `ignore_changes` (including the `tags["LastModified"]` element-level form), `create_before_destroy`, and `precondition`/`postcondition` blocks using `self.<attr>`.
- AWS provider resource type names referenced (`aws_instance`, `aws_s3_bucket`, `aws_security_group_rule`, `aws_lambda_function`, `aws_iam_role_policy_attachment`, `aws_db_instance`, `aws_shield_protection`, `aws_lb`) are all valid and current.
- The `aws_security_group_rule` resource is still supported, though AWS users may prefer the newer `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` resources for new code. This is not a correctness issue for the post.
- The post correctly notes preferring `for_each` over `count` and using `lifecycle.prevent_destroy` on production-critical resources, which align with current OpenTofu/Terraform community guidance.
- Version-specific caveat: the `enabled` lifecycle argument requires OpenTofu 1.11 or later and is OpenTofu-specific (it does not exist in Terraform). The post correctly flags the version requirement.
