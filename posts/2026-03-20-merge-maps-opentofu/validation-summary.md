# Validation Summary: How to Merge Maps in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider for Terraform/OpenTofu-compatible configurations
- AWS resource tagging

## Sources Consulted
- OpenTofu `merge` function documentation: https://opentofu.org/docs/language/functions/merge/
- OpenTofu type constraints documentation (`optional(...)` object attributes): https://opentofu.org/docs/language/expressions/type-constraints/
- OpenTofu `for` expressions documentation: https://opentofu.org/docs/language/expressions/for/
- HashiCorp AWS provider documentation for `default_tags`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- HashiCorp Developer tutorial on AWS `default_tags`: https://developer.hashicorp.com/terraform/tutorials/aws/aws-default-tags
- AWS VPC resource documentation (`tags` and `tags_all` behavior): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc

## Issues Found
- The conditional merge example could produce `{ CostCenter = null }` when `enable_cost_allocation = true` and `cost_center = null`. That is unsafe for AWS tagging examples because resource `tags` arguments are string maps. I fixed the snippet by adding explicit variable types and by only adding the `CostCenter` tag when cost allocation is enabled and `cost_center` is non-null.

## Review Notes
- The post’s explanation of `merge()` last-value-wins behavior and shallow merge semantics matches the OpenTofu documentation.
- The `default_tags` section is accurate for the AWS resources shown in the post. As a provider-specific caveat for future updates, `default_tags` is not implemented uniformly across every AWS resource type.
