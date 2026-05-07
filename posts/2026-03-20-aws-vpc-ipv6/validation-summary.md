# Validation Summary: How to Enable IPv6 in AWS VPC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon VPC
- IPv6 networking
- AWS CLI
- Terraform AWS Provider
- AWS CloudFormation

## Sources Consulted
- AWS CLI `describe-vpcs` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpcs.html
- AWS CLI `associate-vpc-cidr-block` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-vpc-cidr-block.html
- Amazon VPC User Guide, VPC CIDR blocks: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- Amazon VPC User Guide, Add or remove an IPv6 CIDR block from your subnet: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-associate-ipv6-cidr.html
- Amazon VPC User Guide, IP addressing for your VPCs and subnets: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html
- Amazon VPC User Guide, Egress-only internet gateway: https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html
- Amazon EC2 User Guide, Instance IP addressing: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-instance-addressing.html
- AWS CloudFormation Template Reference, `AWS::EC2::VPCCidrBlock`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpccidrblock.html
- AWS CloudFormation Template Reference, `AWS::EC2::VPC`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpc.html
- Terraform AWS Provider docs source, `aws_vpc`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/vpc.html.markdown

## Issues Found
1. **The AWS CLI filter name for non-default VPCs was incorrect.** The post used `Name=isDefault`, but the AWS CLI `describe-vpcs` filter name is `is-default`. I corrected the command so it matches the current CLI reference.

2. **The post incorrectly stated that all AWS IPv6 addresses are public.** AWS now documents both public IPv6 and private IPv6, with private IPv6 available through Amazon VPC IP Address Manager (IPAM). I updated the introduction, comparison table, and notes to scope the “public” statements to Amazon-provided IPv6 and to mention private IPv6 via IPAM.

3. **The post overstated IPv6 subnet sizing requirements.** It said `/64` subnets are required, but the current VPC subnet docs allow an IPv6 subnet netmask equal to or more specific than the VPC CIDR, up to `/64`, in `/4` increments. For an Amazon-provided `/56`, that means `/56`, `/60`, or `/64`. I corrected the introduction, table, and conclusion.

4. **One verification command’s description and filter logic were misleading.** The command labeled “Check if IPv6 is available in your region” did not actually test regional IPv6 support, and its original query would not reliably exclude VPCs without IPv6 associations. I changed the description to reflect what the command actually does and tightened the JMESPath filter.

## Review Notes
- The Terraform example pins `hashicorp/aws` to `~> 5.0`. The reviewed `aws_vpc` arguments used in the post are still present in the current provider docs, so the example remains technically valid.
- The AWS CLI example still selects the first non-default VPC returned in the current account and region. That is fine for a compact example, but a production workflow would usually target a specific VPC ID or tag filter.
