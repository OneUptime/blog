# Validation Summary: How to Create Named Resources with for_each and Maps in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- `for_each` meta-argument with maps
- HCL type constraints (`map(object({...}))`)
- HCL for-expressions (with filtering and `key => value` form)
- HCL splat operator
- AWS provider resources: `aws_s3_bucket`, `aws_s3_bucket_versioning`, `aws_vpc`, `aws_autoscaling_group`, `aws_launch_template`
- HCL `merge()` function

## Sources Consulted
- HCL native syntax spec: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- OpenTofu type constraints docs: https://opentofu.org/docs/language/expressions/types/
- OpenTofu for-expressions docs: https://opentofu.org/docs/language/expressions/for/
- OpenTofu splat expressions docs: https://opentofu.org/docs/language/expressions/splat/
- OpenTofu `for_each` meta-argument: https://opentofu.org/docs/language/meta-arguments/for_each/
- AWS provider `aws_s3_bucket_versioning`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- AWS provider `aws_autoscaling_group` (launch_template version syntax): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group

## Issues Found
1. **Invalid HCL syntax — semicolons used as object attribute separators.** In the "Merging Maps from Multiple Sources" section, the type constraint was written as `map(object({ versioning = bool; public = bool }))`. Per the HCL native syntax spec, object attributes may only be separated by commas or newlines; semicolons are not part of the grammar. Changed `;` to `,` to make the type constraint parse correctly and stay consistent with the comma-separated object literals used elsewhere in the post.

## Review Notes
- `aws_s3_bucket_versioning` is correctly used as the standalone resource (the inline `versioning` block on `aws_s3_bucket` was deprecated in AWS provider v4+).
- `version = "$Latest"` inside the `launch_template` block is the correct literal string for AWS launch template version selection (alongside `$Default` or a numeric version).
- `values(aws_vpc.envs)[*].id` correctly relies on `values()` returning a list, on which the splat operator extracts each element's `id`.
- The map-producing for-expression with the `if` filter (`for name, config in var.s3_buckets : name => config if config.versioning`) is valid HCL.
- Snippets reference `data.aws_caller_identity.current`, `aws_subnet.private`, and `aws_launch_template.app` without showing their definitions; this is fine in the context of focused examples but readers should know those resources/data sources need to exist for the snippets to compile.
- Tag values like `Public = each.value.public` use a boolean. Terraform/OpenTofu implicitly converts these to strings for AWS tag values, so this is functional but not strictly idiomatic — explicit `tostring(...)` could be clearer. Not a correctness error.
