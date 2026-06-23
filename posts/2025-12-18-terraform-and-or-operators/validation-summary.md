# Validation Summary: How to Use AND/OR Conditional Operators in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Configuration Language (HCL)
- Terraform conditional expressions
- Terraform variable validation
- Terraform `count` and dynamic blocks
- AWS provider resources for EC2, RDS, NAT Gateway, CloudWatch, ElastiCache, WAFv2, and IAM

## Sources Consulted
- Terraform operators documentation: https://developer.hashicorp.com/terraform/language/expressions/operators
- Terraform conditional expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/conditionals
- Terraform `count` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform variable block and validation documentation: https://developer.hashicorp.com/terraform/language/block/variable
- Terraform AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_eip` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- Terraform AWS provider `aws_nat_gateway` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- Terraform AWS provider `aws_launch_template` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS provider `aws_wafv2_web_acl` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- AWS EC2 Reserved Instances documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html
- AWS EC2 LaunchTemplateInstanceMarketOptions API documentation: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_LaunchTemplateInstanceMarketOptions.html

## Issues Found
- The environment-based configuration example described `reserved` as an instance purchasing option selected from an EC2 launch template. AWS Reserved Instances are a billing discount applied to matching On-Demand usage, not a launch-template market type. Updated the example to model Spot vs On-Demand instance behavior only.
- The "Avoid Deep Nesting" example had a top-level `bad_example = ...` assignment, which is not valid Terraform configuration syntax outside a block. Wrapped it in a `locals` block.

## Review Notes
The Terraform boolean operator, conditional expression, operator precedence, `count`, dynamic block, and variable validation explanations are consistent with current Terraform documentation. Several AWS snippets are intentionally partial examples and omit surrounding provider configuration, supporting resources, or variable declarations that a complete Terraform module would require.
