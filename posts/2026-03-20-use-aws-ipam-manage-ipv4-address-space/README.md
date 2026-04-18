# How to Use AWS IPAM to Manage IPv4 Address Space

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IPAM, IPv4, Networking, VPC, Address Management

Description: Learn how to use AWS IP Address Manager (IPAM) to plan, track, and manage IPv4 address space across VPCs, accounts, and regions in your AWS organization.

## Introduction

AWS IP Address Manager (IPAM) helps you plan, track, and monitor IP addresses across your AWS infrastructure. Instead of manually tracking CIDR allocations in spreadsheets, IPAM provides a centralized view of your IP address space with automated allocation and conflict detection.

## Setting Up IPAM

Create an IPAM and scope:

```bash
# Create IPAM

aws ec2 create-ipam \
  --region us-east-1 \
  --description "Organization IPAM" \
  --operating-regions "RegionName=us-east-1" "RegionName=us-west-2" "RegionName=eu-west-1"
```

## Creating an IPAM Pool

Define your top-level address space:

```bash
# Create top-level pool
aws ec2 create-ipam-pool \
  --ipam-scope-id ipam-scope-xxxxxxxx \
  --address-family ipv4 \
  --auto-import true \
  --locale us-east-1 \
  --tag-specifications 'ResourceType=ipam-pool,Tags=[{Key=Name,Value=corporate-ipv4}]'

# Provision CIDR to the pool
aws ec2 provision-ipam-pool-cidr \
  --ipam-pool-id ipam-pool-xxxxxxxx \
  --cidr 10.0.0.0/8
```

## Creating Regional Sub-Pools

Subdivide address space by region or environment:

```bash
# US East production pool
aws ec2 create-ipam-pool \
  --ipam-scope-id ipam-scope-xxxxxxxx \
  --source-ipam-pool-id ipam-pool-xxxxxxxx \
  --address-family ipv4 \
  --locale us-east-1 \
  --allocation-min-netmask-length 16 \
  --allocation-max-netmask-length 20 \
  --allocation-default-netmask-length 16

# Allocate CIDR from parent pool
aws ec2 provision-ipam-pool-cidr \
  --ipam-pool-id ipam-pool-us-east-xxxxxxxx \
  --cidr 10.0.0.0/12
```

## Creating VPCs with IPAM Allocation

Automatically allocate a CIDR from IPAM when creating a VPC:

```bash
aws ec2 create-vpc \
  --ipv4-ipam-pool-id ipam-pool-xxxxxxxx \
  --ipv4-netmask-length 16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=prod-vpc}]'
```

## OpenTofu/Terraform Integration

```hcl
resource "aws_vpc" "main" {
  ipv4_ipam_pool_id   = data.aws_vpc_ipam_pool.main.id
  ipv4_netmask_length = 16

  tags = {
    Name = "prod-vpc"
  }
}

data "aws_vpc_ipam_pool" "main" {
  filter {
    name   = "tag:Name"
    values = ["us-east-1-prod"]
  }
}
```

## Viewing IPAM Utilization

```bash
aws ec2 get-ipam-pool-allocations \
  --ipam-pool-id ipam-pool-xxxxxxxx

aws ec2 get-ipam-resource-cidrs \
  --ipam-scope-id ipam-scope-xxxxxxxx \
  --resource-type vpc
```

## Detecting Overlapping CIDRs

IPAM automatically detects and reports overlapping CIDRs in your inventory view. Check the IPAM console or:

```bash
aws ec2 get-ipam-resource-cidrs \
  --ipam-scope-id ipam-scope-xxxxxxxx \
  --filters "Name=overlap-status,Values=overlapping"
```

## Conclusion

AWS IPAM replaces manual IP tracking with automated allocation, conflict detection, and centralized visibility. By using IPAM pools for VPC creation, you eliminate CIDR overlap errors and gain a complete picture of your IPv4 address consumption across your AWS organization.
