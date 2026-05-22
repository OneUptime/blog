# Validation Summary: How to Reference Security Groups Across VPCs in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS VPC
- AWS Security Groups
- VPC Peering
- AWS Transit Gateway
- AWS PrivateLink
- Terraform remote state

## Sources Consulted
- AWS VPC security group rules: https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- AWS VPC peering security group references: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-security-groups.html
- AWS Transit Gateway VPC attachments and security group referencing: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html
- AWS VPC peering DNS resolution: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-dns.html
- Terraform AWS Provider `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS Provider `aws_vpc_security_group_ingress_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- Terraform AWS Provider `aws_vpc_security_group_egress_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_egress_rule
- Terraform AWS Provider `aws_vpc_peering_connection`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection
- Terraform `terraform_remote_state` data source: https://developer.hashicorp.com/terraform/language/state/remote-state-data

## Issues Found
- The post said Transit Gateway always requires CIDR-based security group rules. AWS now supports security group referencing for inbound rules between VPCs attached to the same Transit Gateway when the feature is enabled on both the Transit Gateway and VPC attachments. Updated the limitation and CIDR fallback guidance to reflect that outbound rules and unsupported TGW paths still require CIDR-based rules.
- The same-region VPC peering example used inline ingress and egress blocks that referenced each other across two `aws_security_group` resources. That can create a Terraform dependency cycle and is no longer the provider's recommended pattern. Replaced those inline rules with `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources.
- The same-region security group rule examples did not explicitly depend on the peering connection being active, even though AWS requires an active VPC peering connection before cross-VPC security group references can be added. Added `depends_on` for the peering connection.
- The cross-account example referenced `aws_security_group.app_cross_account.id` without defining that security group. Added the missing app-account security group and moved the database ingress rule into a standalone `aws_vpc_security_group_ingress_rule` resource with a dependency on the peering accepter.

## Review Notes
The remaining examples are illustrative snippets and assume surrounding resources such as route tables, subnets, and provider configuration exist. The post now reflects current AWS behavior for VPC peering and Transit Gateway security group references as of 2026-05-22.
