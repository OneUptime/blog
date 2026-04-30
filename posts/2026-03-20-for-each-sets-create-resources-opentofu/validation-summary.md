# Validation Summary: How to Use for_each with Sets to Create Resources in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider resources for Route 53, IAM, and VPC security groups

## Sources Consulted
- OpenTofu `for_each` meta-argument: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu `toset` function: https://opentofu.org/docs/v1.8/language/functions/toset/
- OpenTofu type constraints and collection conversions: https://opentofu.org/docs/language/expressions/type-constraints/
- AWS provider `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS provider `aws_iam_role`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- AWS provider `aws_iam_user`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user
- AWS provider `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_vpc_security_group_ingress_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- AWS provider `aws_s3_bucket` and S3 CORS guidance: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- AWS provider `aws_s3_bucket_cors_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_cors_configuration

## Issues Found
- The post described `toset([...])` as a "set literal." OpenTofu does not provide set literal syntax, so I changed the wording and section title to describe it as a set expression built from a list literal.
- The `aws_s3_bucket_cors_rule` example used a resource name that is not a current AWS provider resource. I replaced that example with a valid `aws_iam_user` example that still demonstrates `for_each = toset([...])`.
- The security group example used `aws_security_group_rule`. Current AWS provider guidance recommends `aws_vpc_security_group_ingress_rule` for new rules, so I updated the snippet to the current resource and arguments.
- The "Adding and Removing Items" snippet omitted the `set(string)` type, which would make it misleading as a standalone example because `for_each` does not implicitly convert lists to sets. I added the type constraint.

## Review Notes
- The remaining OpenTofu explanations are accurate: `for_each` accepts maps or sets of strings, `each.key` and `each.value` are the same for set members, and `toset()` removes duplicates and discards ordering.
