# Validation Summary: How to Use Security Groups for Stateful Filtering

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS VPC security groups
- Amazon EC2 security group rules
- AWS CLI
- Terraform AWS provider
- AWS CloudTrail
- Managed prefix lists
- Network ACLs

## Sources Consulted
- AWS VPC User Guide: Security group rules - https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- AWS VPC User Guide: Create a security group for your VPC - https://docs.aws.amazon.com/vpc/latest/userguide/creating-security-groups.html
- AWS VPC User Guide: Default security groups for your VPCs - https://docs.aws.amazon.com/vpc/latest/userguide/default-security-group.html
- AWS VPC User Guide: Amazon VPC quotas - https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
- AWS CLI Command Reference: authorize-security-group-ingress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI Command Reference: revoke-security-group-egress - https://docs.aws.amazon.com/cli/latest/reference/ec2/revoke-security-group-egress.html
- AWS CLI Command Reference: create-managed-prefix-list - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-managed-prefix-list.html
- HashiCorp Terraform AWS Provider: aws_security_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- HashiCorp Terraform AWS Provider: aws_security_group_rule - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule

## Issues Found
- The post said every security group starts with no inbound rules and allow-all outbound. AWS documents this for newly created custom security groups, while the default security group has a self-referencing inbound rule. Changed the wording to "Every new custom security group."
- The post implied the default outbound rule means instances can reach the internet. Outbound security group rules are only one requirement; route tables, NAT gateways, internet gateways, and related network configuration also matter. Clarified this dependency.
- Two AWS CLI examples used `--protocol -1` with the shorthand protocol option. The current AWS CLI command reference documents `all` for the shorthand option and `-1` in structured `IpProtocol` values. Updated those CLI examples to use `--protocol all`.

## Review Notes
- The Terraform inline `ingress` and `egress` blocks are valid, but the current Terraform AWS provider documentation recommends standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources as the current best practice for new configurations.
- Security group references are correct for same-VPC examples. Cross-VPC security group referencing has additional VPC peering and Transit Gateway restrictions that are outside the scope of this post.
