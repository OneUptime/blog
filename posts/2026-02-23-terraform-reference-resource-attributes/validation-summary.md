# Validation Summary: How to Reference Resource Attributes in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Configuration Language (HCL)
- Terraform AWS Provider
- AWS EC2
- AWS VPC and Subnet
- AWS Security Groups
- AWS Elastic IP
- AWS Route 53

## Sources Consulted
- Terraform language documentation: References to Named Values and Resource Attributes: https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform language documentation: Splat Expressions: https://developer.hashicorp.com/terraform/language/expressions/splat
- Terraform language documentation: for_each meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform language documentation: Strings and Templates: https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform AWS Provider documentation: aws_instance: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider documentation: aws_eip: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- Terraform AWS Provider documentation: aws_security_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS Provider documentation: aws_route53_record: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record

## Issues Found
- The circular security group example omitted required `ingress` rule fields (`from_port`, `to_port`, and `protocol`). I added those fields so the example demonstrates the intended circular dependency issue rather than failing because the ingress blocks are incomplete.
- The suggested fix for circular security group references used the older generic `aws_security_group_rule` wording. I updated it to recommend creating security groups first and then using separate `aws_vpc_security_group_ingress_rule` resources, which matches the current AWS provider documentation's recommended resource style.

## Review Notes
- Terraform was not installed in the local environment, so CLI validation with `terraform validate` was not available.
- The main article examples are illustrative and omit provider configuration and some referenced resources, such as `aws_security_group.web` or `aws_route53_zone.primary`, in isolated snippets. That is acceptable for this post's focus on attribute reference syntax.
- The AWS provider documentation currently recommends avoiding inline `ingress` and `egress` rules on `aws_security_group` for complex real configurations, but the inline examples in this post remain supported and are reasonable for demonstrating attribute references.
