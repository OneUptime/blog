# Validation Summary: How to Configure AWS Subnet IPv6 CIDR with Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS VPC
- AWS Subnets
- IPv6 networking
- Terraform
- AWS CLI

## Sources Consulted
- Terraform `cidrsubnet` function: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform AWS Provider `aws_vpc` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc.html.markdown
- Terraform AWS Provider `aws_subnet` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/subnet.html.markdown
- AWS VPC CIDR blocks documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- AWS IPv6 support for VPCs and subnets: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-migrate-ipv6-add.html
- AWS CLI `describe-subnets` reference: https://docs.aws.amazon.com/en_us/cli/latest/reference/ec2/describe-subnets.html

## Issues Found
- The post said AWS "always" assigns a `/56` to a VPC. I changed that to explicitly refer to an Amazon-provided IPv6 CIDR block, because AWS also supports IPAM-allocated and BYOIP IPv6 ranges.
- The `cidrsubnet` example used a non-canonical `/56` prefix and incorrect derived `/64` outputs. I corrected the example to use a canonical `/56` (`2600:1f18:1234:5600::/56`) and matching `/64` results.
- The verification command referenced `terraform output -raw vpc_id`, but the post did not define a `vpc_id` output. I added the missing `vpc_id` output so the command works as written.
- The existing-subnet example referenced `aws_vpc_ipv6_cidr_block_association`, which is the VPC-level association resource and not what the snippet was using. I corrected the wording to describe updating the existing `aws_subnet` resource definition instead.
- The AWS CLI query returned the full IPv6 association structures instead of the CIDR strings being discussed. I narrowed the query to `Ipv6CidrBlockAssociationSet[*].Ipv6CidrBlock` so the verification output directly shows the assigned IPv6 CIDRs.

## Review Notes
- The Terraform shown here is valid for the Amazon-provided `/56` VPC IPv6 flow used by `assign_generated_ipv6_cidr_block = true`.
- AWS also supports IPAM-allocated and BYOIP IPv6 CIDR workflows, which have different sizing options than the Amazon-provided `/56` example used in this post.
- The post correctly focuses on subnet CIDR assignment only. In a real dual-stack deployment, route tables, security groups, and for private subnet internet egress an egress-only internet gateway are also required for end-to-end IPv6 connectivity.
