# Validation Summary: How to Create Reusable Terraform Modules for Security Groups

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Security Groups
- AWS VPC security group rules
- Terraform modules

## Sources Consulted
- Terraform language type constraints and optional object attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform language types and `null` omission behavior: https://developer.hashicorp.com/terraform/language/expressions/types
- AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_vpc_security_group_ingress_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- AWS provider `aws_vpc_security_group_egress_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_egress_rule

## Issues Found
- The post stated that every Lambda function needs a security group. This is only true for Lambda functions configured for VPC access, so the wording was changed to "VPC-connected Lambda function."
- The post described the module as enforcing "default deny policies" while the module intentionally defaults to allowing all outbound traffic. This was changed to "baseline rule policies."
- The module used `aws_security_group_rule`, but current AWS provider documentation recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` instead of inline rules or `aws_security_group_rule`. The main module snippet and cross-reference examples were updated to use the VPC security group rule resources.
- The original module accepted a list of `security_groups` but only used the first item. The corrected snippet expands CIDR blocks and security group references into individual rule resources so all configured sources are represented.
- The original egress default used `from_port = 0` and `to_port = 0` with protocol `-1`. The VPC security group rule resources document that `from_port` and `to_port` should not be defined when `ip_protocol = "-1"`, so the default was updated to omit ports.

## Review Notes
Terraform is not installed in this environment, so local `terraform validate` could not be run. The snippets were reviewed against the official Terraform language documentation and the current HashiCorp AWS provider documentation.
