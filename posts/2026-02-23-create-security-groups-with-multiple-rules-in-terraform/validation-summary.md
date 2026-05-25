# Validation Summary: How to Create Security Groups with Multiple Rules in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS EC2 security groups
- AWS VPC networking

## Sources Consulted
- Terraform Registry: `aws_security_group` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform Registry: `aws_vpc_security_group_ingress_rule` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- Terraform Registry: `aws_vpc_security_group_egress_rule` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_egress_rule
- Terraform Registry: `aws_security_group_rule` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS EC2 User Guide: Security group rules - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules.html
- OneUptime linked post: Configure Network ACLs with Terraform - https://oneuptime.com/blog/post/2026-02-23-configure-network-acls-with-terraform/view
- OneUptime linked post: Reference Security Groups Across VPCs in Terraform - https://oneuptime.com/blog/post/2026-02-23-reference-security-groups-across-vpcs-in-terraform/view

## Issues Found
- The inline-rules section said that changing any rule forces Terraform to update the entire security group resource. I changed this to the more precise current provider guidance: inline rules are managed as part of the security group resource and have limitations around multiple CIDR blocks, tags, descriptions, and mixing with standalone rule resources.
- The `for_each` examples modeled CIDR sources as lists but then used only `cidr_blocks[0]` / `cidrs[0]`. Because `aws_vpc_security_group_ingress_rule` accepts one IPv4 CIDR source per rule, I changed those examples to use a single `cidr_ipv4` string per generated rule.
- The reusable module used the older `aws_security_group_rule` resource. Current AWS provider documentation recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for new security group rules, so I updated the module to use `aws_vpc_security_group_ingress_rule`.
- The reusable module used `count` over a list of rule objects. I changed the module input to a map and used `for_each`, which gives stable rule addresses and matches the surrounding guidance in the post.
- The "Mixing inline and separate rules" mistake mentioned only `aws_security_group_rule`. I broadened it to include `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule`, matching the current provider warning.

## Review Notes
- Terraform was not installed in the review environment, so I could not run `terraform fmt` or `terraform validate`. I reviewed the HCL syntax manually against the current AWS provider documentation.
- The examples intentionally assume surrounding resources such as `aws_vpc.main`, `aws_security_group.alb`, and module outputs already exist.
