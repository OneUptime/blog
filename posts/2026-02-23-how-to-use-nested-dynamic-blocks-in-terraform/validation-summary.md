# Validation Summary: How to Use Nested Dynamic Blocks in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform HCL dynamic blocks
- AWS WAFv2 rule groups
- AWS Network ACL rules
- AWS security groups
- AWS Load Balancer listener rules

## Sources Consulted
- HashiCorp Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- HashiCorp Terraform AWS provider `aws_wafv2_rule_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_rule_group
- HashiCorp Terraform AWS provider `aws_lb_listener_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule
- HashiCorp Terraform AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- HashiCorp Terraform AWS provider `aws_network_acl_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl_rule
- AWS VPC Network ACL rules documentation: https://docs.aws.amazon.com/vpc/latest/userguide/nacl-rules.html
- AWS Elastic Load Balancing listener rule action types documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-action-types.html

## Issues Found
- The post said an AWS Network ACL rule can have multiple CIDR block entries. The AWS provider's `aws_network_acl_rule` schema allows one `cidr_block` or one `ipv6_cidr_block` per rule, so the wording was changed to describe generating similar rules once per CIDR entry.
- The WAF example accepted arbitrary `action` and `match_type` values but only generated `allow`/`block` actions and `single_header` inside `field_to_match`. That could produce an invalid empty `action` or `field_to_match` block for unsupported values. Added validation for the supported example values and generated matching `single_query_argument`, `method`, and `query_string` blocks. Also required at least two conditions because WAF `or_statement` combines more than one nested statement.
- The load balancer listener rule example modeled weighted target groups using `target_group_arn` and a top-level `weight` value. The AWS provider requires weighted forwarding to use an `action.forward.target_group` block. Updated the example to use a literal `forward` action with a nested dynamic `target_group` block.

## Review Notes
Terraform is not installed in the local environment, so the examples were not validated with `terraform validate`. The reviewed syntax and provider schemas were checked against official HashiCorp and AWS documentation. The post's broader guidance on nested dynamic blocks, default iterators, named iterators, and preprocessing complex data with locals matches HashiCorp's documentation.
