# Validation Summary: How to Use AWS IPAM to Manage IPv4 Address Space

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IP Address Manager (IPAM)
- AWS EC2 CLI (`aws ec2` IPAM subcommands)
- Amazon VPC
- OpenTofu / Terraform (`aws_vpc`, `aws_vpc_ipam_pool` data source)
- IPv4 CIDR addressing

## Sources Consulted
- AWS CLI v2 reference for `ec2 create-ipam`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-ipam.html
- AWS CLI v2 reference for `ec2 create-ipam-pool`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-ipam-pool.html
- AWS CLI v2 reference for `ec2 provision-ipam-pool-cidr`: https://docs.aws.amazon.com/cli/latest/reference/ec2/provision-ipam-pool-cidr.html
- AWS CLI v2 reference for `ec2 create-vpc`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc.html
- AWS CLI v2 reference for `ec2 get-ipam-pool-allocations`: https://docs.aws.amazon.com/cli/latest/reference/ec2/get-ipam-pool-allocations.html
- AWS CLI v2 reference for `ec2 get-ipam-resource-cidrs`: https://docs.aws.amazon.com/cli/latest/reference/ec2/get-ipam-resource-cidrs.html
- AWS VPC IPAM User Guide: https://docs.aws.amazon.com/vpc/latest/ipam/what-it-is-ipam.html
- Terraform AWS provider `aws_vpc` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- Terraform AWS provider `aws_vpc_ipam_pool` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc_ipam_pool

## Issues Found
- The original "Detecting Overlapping CIDRs" example used `aws ec2 describe-ipam-resource-discoveries`, which returns resource-discovery configurations (the plumbing IPAM uses to find resources in other accounts) — it does not surface overlapping CIDRs. Replaced it with `aws ec2 get-ipam-resource-cidrs` filtered by `overlap-status=overlapping`, which is the supported way to list resources whose CIDRs overlap other resources in the same scope.

## Review Notes
- The `--auto-import true` syntax on `create-ipam-pool` works because AWS CLI v2 accepts both the boolean-valued form and the `--auto-import` / `--no-auto-import` shorthand. Either form is valid.
- The sub-pool example sets `--allocation-default-netmask-length 16` equal to `--allocation-min-netmask-length 16` (minimum netmask length is the *largest* allowable allocation). That is legal but worth noting: every default allocation will consume a /16 unless the caller overrides it.
- The top-level pool is provisioned with `10.0.0.0/8` and the regional sub-pool with `10.0.0.0/12`; the sub-pool CIDR is correctly a subset of the parent, as IPAM requires.
- The Terraform snippet correctly uses `ipv4_ipam_pool_id` + `ipv4_netmask_length` on `aws_vpc` and looks up the pool by tag — both supported by the AWS provider.
