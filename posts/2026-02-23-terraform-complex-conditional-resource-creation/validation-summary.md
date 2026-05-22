# Validation Summary: How to Use Terraform for Complex Conditional Resource Creation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform `count` and `for_each` meta-arguments
- Terraform conditional expressions, `for` expressions, dynamic blocks, and `one()` function
- AWS provider resources for ALB/ELBv2, ECS, WAFv2, ElastiCache, RDS, ACM, Route 53, and CloudFront

## Sources Consulted
- Terraform `count` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform `for` expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform `one()` function documentation: https://docs.hashicorp.com/terraform/language/functions/one
- Terraform AWS provider `aws_lb` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform AWS provider `aws_lb_listener` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform AWS provider `aws_elasticache_parameter_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_parameter_group
- AWS CloudFront SSL/TLS certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html

## Issues Found
- The `aws_lb_listener` example placed a dynamic `stickiness` block directly inside `default_action` while also using `target_group_arn`. The AWS provider schema defines `stickiness` inside the `forward` block, so the example was changed to use `default_action { type = "forward"; forward { target_group { arn = ... }; dynamic "stickiness" { ... } } }`.
- The `count` pitfall said adding a resource between two counted resources shifts indexes. Terraform state indexes are not affected by source file position; the risky case is indexing into a list with `count` and then inserting or removing list elements. The wording was corrected to describe collection-order index churn.

## Review Notes
- The CloudFront ACM example is structurally correct for Terraform conditional chaining, but in a complete AWS deployment the ACM certificate used by CloudFront must be requested or imported in `us-east-1`.
- Several AWS snippets are intentionally partial and omit required provider-specific fields that are not relevant to the conditional-resource pattern being demonstrated.
