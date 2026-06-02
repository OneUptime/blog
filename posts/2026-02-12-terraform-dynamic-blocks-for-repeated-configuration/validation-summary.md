# Validation Summary: How to Use Terraform Dynamic Blocks for Repeated Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform dynamic blocks
- AWS Terraform provider
- AWS security groups
- IAM policy documents
- ALB listener rules
- DynamoDB global secondary indexes

## Sources Consulted
- HashiCorp Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- HashiCorp Terraform AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- HashiCorp Terraform AWS provider `aws_iam_policy_document` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- HashiCorp Terraform AWS provider `aws_lb_listener_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule
- HashiCorp Terraform AWS provider `aws_dynamodb_table` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- HashiCorp Terraform AWS provider `aws_network_acl` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl

## Issues Found
- The security group examples used inline `ingress` and `egress` blocks without noting that the current AWS provider documentation recommends standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for production security group rules. Added a short caveat while keeping the inline examples for demonstrating nested dynamic blocks.
- The generic anatomy snippet showed placeholder `key` and `value` arguments inside `content`, which could be mistaken for valid arguments on arbitrary nested blocks. Changed it to show a generic nested-block argument using iterator values and documented `CUSTOM_NAME.key` as a comment.
- The DynamoDB GSI example used `hash_key` and `range_key` inside `global_secondary_index`, which the current AWS provider documentation marks as deprecated. Updated the example to use `key_schema` blocks, including a nested dynamic block for the optional range key.
- The "Nested Dynamic Blocks" section claimed to demonstrate nested dynamic blocks but only contained one dynamic block. Replaced the example with an ALB listener rule snippet that nests dynamic `host_header` and `path_pattern` blocks inside a dynamic `condition` block.

## Review Notes
Terraform is not installed in the workspace, so `terraform fmt` and `terraform validate` could not be run locally. The examples were checked against the current official Terraform language documentation and AWS provider resource/data source documentation.
