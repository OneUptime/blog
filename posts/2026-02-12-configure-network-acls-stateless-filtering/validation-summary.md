# Validation Summary: How to Configure Network ACLs for Stateless Filtering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC Network ACLs
- AWS Security Groups
- AWS CLI for Amazon EC2/VPC
- VPC Flow Logs
- Terraform AWS provider

## Sources Consulted
- AWS VPC User Guide: Custom network ACLs for your VPC - https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- AWS VPC User Guide: Default network ACL for a VPC - https://docs.aws.amazon.com/vpc/latest/userguide/default-network-acl.html
- AWS VPC User Guide: Network ACL rules - https://docs.aws.amazon.com/vpc/latest/userguide/nacl-rules.html
- AWS CLI Command Reference: create-network-acl-entry - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-acl-entry.html
- AWS CLI Command Reference: create-network-acl - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-acl.html
- AWS CLI Command Reference: replace-network-acl-association - https://docs.aws.amazon.com/cli/latest/reference/ec2/replace-network-acl-association.html
- AWS CLI Command Reference: describe-network-acls - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-acls.html
- AWS VPC User Guide: Flow log record examples - https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-records-examples.html
- Terraform Registry: aws_network_acl resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl

## Issues Found
- The ephemeral port explanation implied that all instance return traffic uses ports 1024-65535. AWS documents that the client chooses the ephemeral port range and that common ranges vary by operating system and AWS service, so the post now explains that 1024-65535 is a broad range used to cover mixed clients.
- The rule numbering strategy described rule 32766 as the implicit deny. AWS uses an unmodifiable `*` rule for the implicit deny, while numbered rules are evaluated before it. The bullet now uses `*`.
- The Terraform example was described as equivalent to the AWS CLI example but omitted the inbound SSH rule. Added the matching SSH ingress rule restricted to `203.0.113.50/32`.
- The VPC Flow Logs troubleshooting text implied flow logs directly distinguish NACL problems from security group problems. AWS flow log records show accepted/rejected traffic at the VPC networking layer; the text now says they help narrow the problem before comparing NACL and security group rules.

## Review Notes
The AWS CLI commands and Terraform `aws_network_acl` attributes match current official documentation. The post uses IPv4-only examples; that is valid, but future revisions could mention that IPv6 traffic needs separate IPv6 CIDR rules.
