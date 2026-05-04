# Validation Summary: How to Create an AWS VPC with a Custom IPv4 CIDR Block

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- AWS VPC (Virtual Private Cloud)
- AWS CLI (ec2 create-vpc, modify-vpc-attribute, describe-vpcs, describe-vpc-attribute)
- AWS CloudFormation (AWS::EC2::VPC)
- IPv4 CIDR notation and subnetting
- AWS networking concepts (DNS support, DNS hostnames, multi-AZ subnetting)

## Sources Consulted
- AWS CLI v2 Reference: `aws ec2 create-vpc` (https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc.html)
- AWS CLI v2 Reference: `aws ec2 modify-vpc-attribute` (https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-attribute.html)
- AWS CLI v2 Reference: `aws ec2 describe-vpcs` (https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpcs.html)
- AWS CLI v2 Reference: `aws ec2 describe-vpc-attribute` (https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpc-attribute.html)
- AWS CloudFormation Reference: `AWS::EC2::VPC` (https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-vpc.html)
- AWS VPC User Guide: VPC and subnet sizing for IPv4 (https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html)
- AWS VPC User Guide: VPC subnet reserved IPs (https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html)

## Issues Found
1. **`describe-vpcs` query referenced a non-existent field.** The original `--query 'Vpcs[0].{CIDR:CidrBlock,State:State,DNS:EnableDnsHostnames}'` referenced `EnableDnsHostnames`, which is not part of the `describe-vpcs` response structure. DNS attributes (`enableDnsHostnames`, `enableDnsSupport`) are returned by the separate `describe-vpc-attribute` API. Fixed by removing the bogus field from the query and adding the correct `describe-vpc-attribute` calls below.

## Review Notes
- The CIDR Size Recommendations table conflates VPC sizing with subnet sizing — the "Usable IPs" column reflects what would be available if the entire VPC were used as a single subnet (AWS reserves 5 IPs per subnet, not per VPC). The clarifying note below the table does call this out, so it's a defensible educational simplification rather than an error.
- The boolean shorthand `--enable-dns-support` / `--enable-dns-hostnames` (no value) is supported by the AWS CLI v2 and equivalent to `Value=true`.
- The `aws cloudformation deploy` command works without `--capabilities` here because the template contains no IAM resources. If readers later add IAM resources, they will need `--capabilities CAPABILITY_IAM`.
- The multi-AZ CIDR layout is non-overlapping and well within the /16 VPC range.
- The author may want to mention that VPC CIDR blocks must be between /16 and /28 in size (a common gotcha when planning).
