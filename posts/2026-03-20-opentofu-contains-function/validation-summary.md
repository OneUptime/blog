# Validation Summary: How to Use the contains Function in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (HCL configuration language)
- Terraform (compatible syntax)
- AWS provider (`aws_cloudwatch_metric_alarm`, `aws_ami_ids`, `aws_instance`)
- Built-in functions: `contains`, `strcontains`, `keys`, `join`, `length`

## Sources Consulted
- OpenTofu `contains` function documentation: https://opentofu.org/docs/language/functions/contains/
- OpenTofu `strcontains` function documentation: https://opentofu.org/docs/language/functions/strcontains/
- OpenTofu input variable validation: https://opentofu.org/docs/language/values/variables/#custom-validation-rules
- OpenTofu precondition / postcondition blocks: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu `for` expressions: https://opentofu.org/docs/language/expressions/for/
- AWS provider `aws_ami` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- AWS provider `aws_ami_ids` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami_ids
- AWS provider `aws_cloudwatch_metric_alarm` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
- **Approved AMI example used the wrong data source.** The original example defined `data "aws_ami" "approved"` (which returns a single AMI) and then used `data.aws_ami.approved.*.id` in `contains(...)`. The splat operator on a single data source produces a one-element list, which makes the membership check effectively equivalent to a plain equality check against a single AMI ID — contradicting the stated intent of validating against a set of approved AMIs. Replaced the data source with `aws_ami_ids` and updated the reference to `data.aws_ami_ids.approved.ids`, which is a list attribute and matches the example's narrative.

## Review Notes
- The `contains` function signature, return type, and behavior on lists/sets are described correctly.
- The distinction between `contains` (list/set membership) and `strcontains` (substring test) is accurate.
- The variable `validation` block, `lifecycle.precondition` block, and `for` expression filtering syntax are all correct for current OpenTofu.
- Note for readers: `contains` performs an exact-match comparison and does not coerce types (e.g., `contains([1, 2, 3], "1")` returns `false`). The post does not state this explicitly but the examples are consistent with this behavior.
- The `tofu console` invocation and example output are accurate.
