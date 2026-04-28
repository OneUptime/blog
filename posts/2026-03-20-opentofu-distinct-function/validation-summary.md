# Validation Summary: How to Use the distinct Function in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (HCL configuration language)
- Terraform (compatible function)
- AWS provider (aws_instance, aws_iam_policy resources used in examples)

## Sources Consulted
- OpenTofu official documentation for `distinct` function: https://opentofu.org/docs/language/functions/distinct/
- OpenTofu official documentation for `concat` function: https://opentofu.org/docs/language/functions/concat/
- OpenTofu official documentation for `toset` function: https://opentofu.org/docs/language/functions/toset/
- OpenTofu CLI documentation for `tofu console`: https://opentofu.org/docs/cli/commands/console/
- Terraform AWS provider docs for `aws_instance` and `aws_iam_policy` resources

## Issues Found
No technical issues found.

- The `distinct(list)` syntax and behavior described matches the official OpenTofu documentation: returns a new list with duplicates removed, preserving the first occurrence and relative ordering.
- All basic examples produce the documented output.
- The `concat` + `distinct` pairing pattern is accurate and idiomatic.
- The `tofu console` examples are valid.
- The `distinct` vs `toset` comparison is technically correct: `distinct` returns a list preserving first-occurrence order; `toset` returns an unordered set type.
- The HCL syntax in all code blocks (variables, locals, outputs, list-of-objects, for-expression projection) is correct.
- The IAM policy example is valid; `jsonencode` correctly serializes the policy document.

## Review Notes
- The `aws_instance` example uses the `security_groups` argument, which is valid for EC2-Classic or default-VPC scenarios. For non-default VPC instances, `vpc_security_group_ids` is typically preferred. This is not a technical error in the context of demonstrating the `distinct` function, but readers building real infrastructure on a custom VPC may want to use `vpc_security_group_ids` instead.
- The example references `data.aws_ami.ubuntu.id` without defining the data source, but this is an intentional minimal example focused on the `distinct` function rather than a complete configuration.
- Note that `distinct` only operates on lists of primitive (string, number, bool) values reliably; the OpenTofu documentation notes it is not intended for lists of complex/structural types. The post stays within the supported use cases (lists of strings/numbers and a `for` expression projecting a string field), so this caveat is not violated, but it could be mentioned for completeness in a future revision.
