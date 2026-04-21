# Validation Summary: How to Configure Security Groups for IPv4 Using Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform AWS Provider
- AWS VPC security groups
- IPv4 CIDR rules
- Security group references

## Sources Consulted
- Terraform AWS Provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS Provider `aws_vpc_security_group_ingress_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- Terraform AWS Provider `aws_vpc_security_group_egress_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_egress_rule
- Terraform AWS Provider `aws_security_group_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS VPC security group rules documentation: https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- AWS VPC security group basics and best practices: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html
- Terraform CLI `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI `apply` command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform CLI `output` command documentation: https://developer.hashicorp.com/terraform/cli/commands/output

## Issues Found
- The original examples used inline `ingress` and `egress` blocks and `aws_security_group_rule`. The current Terraform AWS Provider documentation recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` as the best-practice resources for VPC security group rules, and warns against mixing inline rules with separate rule resources. Updated the examples and conclusion to use the current rule resources consistently.
- The original security-group-reference examples used inline `security_groups = [aws_security_group.web.id]` and separate-rule `source_security_group_id`. Updated those examples to use `referenced_security_group_id`, which is the correct argument for `aws_vpc_security_group_ingress_rule`.
- The original IPv4 CIDR examples used `cidr_blocks` lists inside inline rule blocks. Updated them to use the current VPC rule resource argument `cidr_ipv4`.
- The original all-outbound rules used `from_port = 0` and `to_port = 0` with `protocol = "-1"`. Updated the VPC egress rule examples to use `ip_protocol = "-1"` without port fields, matching the current provider documentation for `aws_vpc_security_group_egress_rule`.

## Review Notes
The Terraform CLI is not installed in this local environment, so I could not run `terraform validate`. The snippets were checked against the official Terraform AWS Provider resource documentation and Terraform CLI command documentation.
