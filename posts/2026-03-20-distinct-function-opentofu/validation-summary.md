# Validation Summary: How to Use the distinct Function in OpenTofu

## Status
validated

## Post Type
Reference tutorial

## Technologies Covered
- OpenTofu
- HCL
- AWS provider examples for EC2 instances

## Sources Consulted
- OpenTofu `distinct` function documentation: https://opentofu.org/docs/language/functions/distinct/
- OpenTofu `concat` function documentation: https://opentofu.org/docs/language/functions/concat/
- OpenTofu `toset` function documentation: https://opentofu.org/docs/language/functions/toset/
- OpenTofu `for` expressions documentation: https://opentofu.org/docs/language/expressions/for/
- OpenTofu `for_each` meta-argument documentation: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- Terraform AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The section heading `Combining Multiple Tag Lists` did not match the example, which actually deduplicates `instance_ids` from two modules. I changed the heading to `Combining Multiple Instance ID Lists` so the explanation matches the code.
- The section heading `Deduplicating from for_each` was technically incorrect because the example uses a `for` expression (`[for s in var.services : s.region]`), not the `for_each` meta-argument. I changed the heading to `Deduplicating with a for Expression` to match OpenTofu terminology.

## Review Notes
The post's explanation of `distinct()` is otherwise accurate and aligns with current OpenTofu documentation: it removes duplicate list elements, preserves the first occurrence, and keeps relative order. The `toset()` comparison is also correct that conversion removes duplicates and discards ordering. Some snippets are illustrative rather than fully standalone, such as the omitted AMI data source and assumed module outputs, but they are technically valid for demonstrating `distinct()`.
