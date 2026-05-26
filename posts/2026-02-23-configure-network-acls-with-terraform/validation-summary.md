# Validation Summary: How to Configure Network ACLs with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS VPC
- AWS Network ACLs
- AWS Security Groups
- AWS CLI

## Sources Consulted
- Terraform AWS provider `aws_network_acl` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl
- Terraform AWS provider `aws_network_acl_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl_rule
- AWS VPC custom network ACL documentation: https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- AWS VPC network ACL creation and rule numbering documentation: https://docs.aws.amazon.com/vpc/latest/userguide/create-network-acl.html
- AWS VPC infrastructure security comparison for security groups and network ACLs: https://docs.aws.amazon.com/vpc/latest/userguide/infrastructure-security.html
- AWS CLI `describe-network-acls` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-acls.html

## Issues Found
- The inline rules section did not mention that Terraform must not manage the same NACL with both inline `ingress` / `egress` blocks and standalone `aws_network_acl_rule` resources. Added a short warning because the AWS provider documentation states these approaches conflict and overwrite rule settings.
- The blocked CIDR example described `198.51.100.0/24` and `203.0.113.0/24` as bad actor ranges. These are documentation/example address ranges, so the comments were changed to describe them as example blocked ranges.
- The multi-subnet example defined `inbound_rules` data but never applied those rules to the `aws_network_acl` resources. Added dynamic `ingress` blocks and corresponding `outbound_rules` / dynamic `egress` blocks so the custom NACLs actually include the rules and allow response traffic where needed.

## Review Notes
Terraform was not installed in the workspace, so `terraform validate` could not be run locally. The HCL examples were reviewed against the current Terraform AWS provider documentation and AWS VPC documentation.
