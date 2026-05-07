# How to Enable IPv6 in AWS VPC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IPv6, VPC, Cloud Networking, Amazon Web Services

Description: Enable IPv6 in an AWS VPC by associating an Amazon-provided IPv6 CIDR block, configuring subnets, and setting up routing for dual-stack or IPv6-only workloads.

## Introduction

AWS supports IPv6 across most services. In this guide, you assign an Amazon-provided `/56` IPv6 CIDR block to your VPC, then allocate subnet IPv6 CIDR blocks from that range. Amazon-provided IPv6 addresses are globally routable - there is no NAT for IPv6 in AWS, unlike private IPv4 with NAT Gateway. This guide covers enabling and configuring IPv6 in a new or existing VPC.

## Enable IPv6 on a VPC

```bash
# Using AWS CLI

# Get your VPC ID

VPC_ID=$(aws ec2 describe-vpcs \
    --filters "Name=is-default,Values=false" \
    --query "Vpcs[0].VpcId" \
    --output text)

echo "VPC ID: $VPC_ID"

# Associate Amazon-provided IPv6 CIDR block with the VPC
aws ec2 associate-vpc-cidr-block \
    --vpc-id "$VPC_ID" \
    --amazon-provided-ipv6-cidr-block

# Get the assigned IPv6 CIDR
aws ec2 describe-vpcs \
    --vpc-ids "$VPC_ID" \
    --query "Vpcs[0].Ipv6CidrBlockAssociationSet"
```

## Create VPC with IPv6 Enabled (Terraform)

```hcl
# main.tf - VPC with IPv6

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  # Enable IPv6
  assign_generated_ipv6_cidr_block = true

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "ipv6-enabled-vpc"
  }
}

# Output the IPv6 CIDR assigned to the VPC
output "vpc_ipv6_cidr" {
  value = aws_vpc.main.ipv6_cidr_block
}

output "vpc_id" {
  value = aws_vpc.main.id
}
```

## Verify VPC IPv6 Configuration

```bash
# Check VPC IPv6 configuration
aws ec2 describe-vpcs \
    --vpc-ids "$VPC_ID" \
    --query "Vpcs[0].{VpcId:VpcId, IPv4CIDR:CidrBlock, IPv6CIDR:Ipv6CidrBlockAssociationSet[0].Ipv6CidrBlock, State:Ipv6CidrBlockAssociationSet[0].Ipv6CidrBlockState.State}"
```

## Key VPC IPv6 Concepts

| Concept | IPv4 | IPv6 |
|---------|------|------|
| VPC CIDR | `/16` (private) | `/56` from Amazon pool |
| Subnet CIDR | `/24` typical | `/56`, `/60`, or `/64` from the VPC range |
| Internet access | Via IGW or NAT Gateway | Via IGW or Egress-Only IGW |
| Private access | Private IPs | Private IPv6 via VPC IPAM |
| Public IPs | Elastic IPs | Amazon-provided public IPv6 |

## AWS CloudFormation Template

```yaml
# cloudformation-vpc-ipv6.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: VPC with IPv6 enabled

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: IPv6-VPC

  IPv6CidrBlock:
    Type: AWS::EC2::VPCCidrBlock
    Properties:
      VpcId: !Ref VPC
      AmazonProvidedIpv6CidrBlock: true

Outputs:
  VpcId:
    Value: !Ref VPC

  VpcIpv6CidrBlock:
    Description: The IPv6 CIDR block of the VPC
    Value: !Select [0, !GetAtt VPC.Ipv6CidrBlocks]
```

## Important Notes About AWS IPv6

```bash
# AWS IPv6 differences from IPv4:
# 1. Amazon-provided IPv6 addresses are public; private IPv6 is available through VPC IPAM
# 2. No IPv6 NAT in AWS (use Egress-Only IGW for outbound-only)
# 3. Security Groups and NACLs must have explicit IPv6 rules
# 4. Route tables need separate entries for ::/0
# 5. IPv6 is supported on most (not all) instance types

# List VPCs in the current region that already have an IPv6 CIDR block
aws ec2 describe-vpcs \
    --query "Vpcs[?Ipv6CidrBlockAssociationSet[0].Ipv6CidrBlock!=null].{VpcId:VpcId,IPv6:Ipv6CidrBlockAssociationSet[0].Ipv6CidrBlock}"
```

## Conclusion

Enabling IPv6 in AWS VPC requires associating an Amazon-provided `/56` IPv6 CIDR block with your VPC, then assigning subnet IPv6 CIDR blocks from that range. Amazon-provided IPv6 addresses are globally routable public addresses - there's no IPv6 NAT. After enabling IPv6 on the VPC, you must also update subnets, route tables, security groups, and NACLs to support IPv6 traffic. Use Terraform or CloudFormation to manage IPv6 VPC configuration as code.
