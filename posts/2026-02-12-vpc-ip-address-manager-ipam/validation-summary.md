# Validation Summary: How to Use VPC IP Address Manager (IPAM)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon VPC IP Address Manager (IPAM)
- AWS Organizations
- AWS Resource Access Manager (RAM)
- AWS CLI for EC2, RAM, and CloudWatch
- AWS CloudFormation
- IPv4 and IPv6 CIDR pool management

## Sources Consulted
- AWS CLI Command Reference: create-ipam - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-ipam.html
- AWS CLI Command Reference: create-ipam-pool - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-ipam-pool.html
- AWS CLI Command Reference: provision-ipam-pool-cidr - https://docs.aws.amazon.com/cli/latest/reference/ec2/provision-ipam-pool-cidr.html
- AWS CLI Command Reference: create-vpc - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc.html
- AWS CLI Command Reference: enable-ipam-organization-admin-account - https://docs.aws.amazon.com/cli/latest/reference/ec2/enable-ipam-organization-admin-account.html
- AWS CLI Command Reference: get-ipam-resource-cidrs - https://docs.aws.amazon.com/cli/latest/reference/ec2/get-ipam-resource-cidrs.html
- Amazon VPC IPAM User Guide: IPAM metrics - https://docs.aws.amazon.com/vpc/latest/ipam/cloudwatch-ipam-ip-address-usage.html
- Amazon VPC IPAM User Guide: Create IPv6 address pools - https://docs.aws.amazon.com/vpc/latest/ipam/create-ipv6-reg-pool.html
- AWS CloudFormation Template Reference: AWS::EC2::VPC - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpc.html
- AWS CloudFormation Template Reference: AWS::EC2::Subnet - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-subnet.html
- AWS CloudFormation Template Reference: Fn::Cidr - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-cidr.html
- AWS RAM User Guide: Shareable AWS resources - https://docs.aws.amazon.com/ram/latest/userguide/shareable.html

## Issues Found
- The `create-ipam` example used `--tags`, which is not a valid option for that command. Changed it to `--tag-specifications` with `ResourceType=ipam`.
- The `create-ipam-pool` examples used `--tags`, which is not a valid option for that command. Changed them to `--tag-specifications` with `ResourceType=ipam-pool`.
- The production and development pool examples had `--allocation-min-netmask-length 24` and `--allocation-max-netmask-length 16`. AWS requires the minimum netmask length to be less than the maximum, so these were corrected to minimum `16` and maximum `24`.
- The production pool used `--auto-import` without a pool locale. AWS documents that auto-import requires a locale, so `--locale us-east-1` was added to the regional child pools.
- The CloudWatch alarm used a non-existent IPAM metric name, `PoolUtilization`, and dimension `IpamPoolId`. Updated the example to use the documented `PercentAssigned` pool metric and `PoolID` dimension.
- The unmanaged CIDR example used `get-ipam-discovered-resource-cidrs`, which lists discovered CIDRs but does not directly report IPAM management state. Replaced it with `get-ipam-resource-cidrs` filtered by `management-state=unmanaged`.
- The IPv6 pool example combined `--publicly-advertisable` with an Amazon-provided IPv6 CIDR. AWS only allows `PubliclyAdvertisable` when `PublicIpSource` is `byoip`, so this was changed to `--public-ip-source amazon` and a locale was added for Amazon-provided IPv6 provisioning.

## Review Notes
- The AWS CLI was not installed in the local environment, so commands were verified against current official AWS documentation rather than local `aws --help` output.
- The CloudFormation example is syntactically consistent with the documented `AWS::EC2::VPC`, `AWS::EC2::Subnet`, and `Fn::Cidr` properties.
