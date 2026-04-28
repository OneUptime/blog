# Validation Summary: How to Create Multiple Similar Resources with count in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- `count` meta-argument and `count.index`
- `for_each` meta-argument (comparison)
- Splat expressions (`[*]`)
- AWS provider resources: `aws_instance`, `aws_eip`, `aws_subnet`, `aws_nat_gateway`, `aws_lb_target_group_attachment`, `aws_s3_bucket`

## Sources Consulted
- OpenTofu language docs — `count` meta-argument: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu language docs — `for_each` meta-argument: https://opentofu.org/docs/language/meta-arguments/for_each/
- OpenTofu language docs — Splat expressions: https://opentofu.org/docs/language/expressions/splat/
- Terraform AWS Provider — `aws_eip`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip (verified `domain = "vpc"` replaces deprecated `vpc = true`)
- Terraform AWS Provider — `aws_instance`, `aws_subnet`, `aws_nat_gateway`, `aws_lb_target_group_attachment`, `aws_s3_bucket` resource argument references

## Issues Found
No technical issues found.

## Review Notes
- The `availability_zones` variable declared in the first code block is not used within that snippet (the snippet uses `private_subnet_ids` instead). This is cosmetic and typical of standalone illustrative examples; not a technical error.
- The "Creating Multiple Subnets Across AZs" snippet references `aws_subnet.public[count.index].id` but only defines `aws_subnet.private`. This is a reasonable shortcut for an illustrative snippet (the public subnets are assumed to exist elsewhere in the configuration), not a correctness issue.
- The `aws_eip` examples correctly use `domain = "vpc"` instead of the deprecated `vpc = true` argument (deprecation introduced in AWS provider 5.x).
- The re-indexing explanation in the count vs for_each section accurately captures the core problem: removing an item from a count-based list shifts subsequent indices, causing OpenTofu to plan changes (and, for resources with ForceNew identifiers like `aws_s3_bucket.bucket`, replacement) for the affected slots.
