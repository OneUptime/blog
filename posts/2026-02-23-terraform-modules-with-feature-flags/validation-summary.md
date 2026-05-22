# Validation Summary: How to Create Terraform Modules with Feature Flags

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform modules
- HCL optional object attributes, variable validation, conditionals, and dynamic blocks
- AWS Terraform Provider resources for WAFv2, Elastic Load Balancing, ElastiCache, and EC2 launch templates
- AWS EC2 Spot Instances and Elastic Fabric Adapter configuration

## Sources Consulted
- Terraform type constraints and optional object attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform input variables and validation blocks: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform validation overview: https://developer.hashicorp.com/terraform/language/validate
- Terraform dynamic blocks: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- AWS Provider `aws_wafv2_web_acl`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- AWS Provider `aws_wafv2_web_acl_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl_association
- AWS Provider `aws_elasticache_replication_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- AWS Provider `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Amazon EC2 Elastic Fabric Adapter launch template guidance: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-efa.html

## Issues Found
- The launch template example described `interface_type = "efa"` as generic enhanced networking. In AWS, that value configures an Elastic Fabric Adapter network interface, not general EC2 enhanced networking. I changed the feature flag and comment from `enable_enhanced_networking` to `enable_efa_networking` so the example matches the AWS API behavior.

## Review Notes
- The Terraform examples use optional object attributes with defaults, so they require Terraform versions that support optional object attribute defaults. This is current Terraform behavior.
- The WAF, WAF association, ElastiCache replication group, launch template Spot options, and dynamic block patterns matched current Terraform and AWS provider documentation at review time.
