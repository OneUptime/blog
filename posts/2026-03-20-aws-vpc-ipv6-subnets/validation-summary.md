# Validation Summary: How to Configure IPv6 Subnets in AWS VPC

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon VPC
- AWS CLI
- Amazon EC2
- Terraform
- IPv6 networking
- Dual-stack and IPv6-only subnets

## Sources Consulted
- AWS CLI `associate-subnet-cidr-block`: https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-subnet-cidr-block.html
- AWS CLI `modify-subnet-attribute`: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-subnet-attribute.html
- AWS CLI `create-subnet`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-subnet.html
- Amazon VPC User Guide, Add IPv6 support for your VPC: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-migrate-ipv6-add.html
- Amazon VPC User Guide, Add or remove an IPv6 CIDR block from your subnet: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-associate-ipv6-cidr.html
- Amazon VPC User Guide, Modify the IP addressing attributes of your subnet: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-public-ip.html
- Amazon VPC User Guide, IP addressing for your VPCs and subnets: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html
- Amazon EC2 User Guide, Amazon EC2 instance IP addressing: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-instance-addressing.html
- Amazon EC2 User Guide, Hostname types: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hostname-types.html
- Terraform language `cidrsubnet`: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform AWS Provider `aws_subnet`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/subnet.html.markdown
- Terraform AWS Provider `aws_vpc`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc.html.markdown

## Issues Found
- The post implied that VPC IPv6 allocations are always `/56` and that the `cidrsubnet(..., 8, N)` pattern is universal. I corrected the wording to scope that behavior to Amazon-provided VPC IPv6 CIDRs, which is the case the examples use.
- The bash example said it supported subnet numbers `0x00` to `0xff`, but it hardcoded `00` and described the IPv6 change as replacing “octets”. I added a `SUBNET_HEX` variable and corrected the explanation to match the last byte of the fourth hextet in an Amazon-provided `/56`.
- The post stated that all IPv6 in AWS is public and globally routable. I corrected this to distinguish Amazon-provided public IPv6 from private IPv6 ranges available through AWS VPC IPAM, and I qualified the route-table guidance accordingly.

## Review Notes
The Terraform examples remain correct for the common Amazon-provided `/56` case. If the VPC IPv6 CIDR comes from IPAM or BYOIP with a different prefix length, the `cidrsubnet` math must be adjusted to match that prefix length rather than assuming `8` new bits.
