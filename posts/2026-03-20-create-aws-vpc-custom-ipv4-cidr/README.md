# How to Create an AWS VPC with a Custom IPv4 CIDR Block

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, VPC, IPv4, CIDR, Networking, Cloud

Description: Create an AWS VPC with a custom IPv4 CIDR block using the AWS CLI and console, choosing the right size for your workload and enabling DNS hostname resolution.

## Introduction

An AWS VPC (Virtual Private Cloud) is an isolated network in AWS. You define its IPv4 address space using a CIDR block when creating it. Planning the right CIDR size upfront avoids painful re-addressing later.

## CIDR Size Recommendations

| VPC Size | CIDR | Usable IPs |
|---|---|---|
| Small (dev/test) | /24 | 251 |
| Medium | /22 | 1019 |
| Large | /20 | 4091 |
| Very Large (enterprise) | /16 | 65531 |

AWS reserves 5 IPs per subnet (first 4 and last 1).

## Creating a VPC with the AWS CLI

```bash
# Create a VPC with a /20 CIDR block

aws ec2 create-vpc \
  --cidr-block 10.0.0.0/20 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=production-vpc}]' \
  --region us-east-1

# Output includes VpcId - save it
# "VpcId": "vpc-0abc123def456"
```

## Enabling DNS Hostnames

AWS instances need DNS hostnames enabled for services like ELB and ECS:

```bash
VPC_ID=vpc-0abc123def456

# Enable DNS support (required for DNS hostnames)
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-support

# Enable DNS hostnames (assigns public DNS names to instances)
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-hostnames
```

## Verifying the VPC

```bash
# Describe the new VPC
aws ec2 describe-vpcs --vpc-ids $VPC_ID \
  --query 'Vpcs[0].{CIDR:CidrBlock,State:State}' \
  --output table

# DNS attributes are returned by describe-vpc-attribute, not describe-vpcs
aws ec2 describe-vpc-attribute --vpc-id $VPC_ID --attribute enableDnsHostnames
aws ec2 describe-vpc-attribute --vpc-id $VPC_ID --attribute enableDnsSupport
```

## Creating a VPC with CloudFormation

```yaml
# vpc.yaml
AWSTemplateFormatVersion: "2010-09-09"

Resources:
  ProductionVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: "10.0.0.0/20"
      EnableDnsSupport: true
      EnableDnsHostnames: true
      Tags:
        - Key: Name
          Value: production-vpc

Outputs:
  VpcId:
    Value: !Ref ProductionVPC
    Export:
      Name: ProductionVPCId
```

```bash
aws cloudformation deploy \
  --template-file vpc.yaml \
  --stack-name production-vpc \
  --region us-east-1
```

## CIDR Planning for Multi-AZ

For a typical 3-AZ deployment with public/private subnets:

```text
VPC: 10.0.0.0/16

Public subnets:
  us-east-1a: 10.0.1.0/24
  us-east-1b: 10.0.2.0/24
  us-east-1c: 10.0.3.0/24

Private subnets:
  us-east-1a: 10.0.10.0/24
  us-east-1b: 10.0.11.0/24
  us-east-1c: 10.0.12.0/24
```

## Conclusion

Create VPCs with a /16 base for flexibility, then carve /24 subnets per availability zone and tier. Enable DNS support and DNS hostnames immediately after creation. Plan the CIDR to avoid overlap with on-premises networks if you intend to set up VPN or Direct Connect.
