# How to Add a Secondary IPv4 CIDR Block to an Existing AWS VPC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, VPC, IPv4, CIDR, Networking, Cloud Expansion

Description: Expand an existing AWS VPC by adding a secondary IPv4 CIDR block using the AWS CLI, enabling additional subnet creation without replacing the original network configuration.

## Introduction

When an AWS VPC's primary CIDR block runs out of address space, you can add secondary CIDR blocks without recreating the VPC. By default, a VPC can have up to five IPv4 CIDR blocks total, and this quota is adjustable. This is common when Kubernetes pods require more IP space than the original /24 provides.

## Adding a Secondary CIDR Block

```bash
VPC_ID=vpc-0abc123def456

# Add a secondary /16 CIDR block to expand the VPC

aws ec2 associate-vpc-cidr-block \
  --vpc-id $VPC_ID \
  --cidr-block 100.64.0.0/16

# Verify both CIDRs and confirm the new block is in the associated state
aws ec2 describe-vpcs \
  --vpc-ids $VPC_ID \
  --query 'Vpcs[0].CidrBlockAssociationSet[].{CidrBlock:CidrBlock,State:CidrBlockState.State}' \
  --output table
```

Expected output:

```text
+-----------------+------------+
|   CidrBlock     |   State    |
+-----------------+------------+
|  10.0.0.0/16    | associated |
|  100.64.0.0/16  | associated |
+-----------------+------------+
```

## Rules for Secondary CIDRs

- By default, a VPC can have up to 5 IPv4 CIDR blocks total (1 primary + 4 secondary), and this quota is adjustable
- Secondary CIDRs cannot overlap with the primary or other associated CIDRs
- Secondary CIDRs cannot be the same or larger than an existing destination route in a VPC route table, and active peered VPCs must have non-overlapping CIDRs

## Common Use Case: EKS Pod Networking

Amazon EKS can use a secondary CIDR in the `100.64.0.0/10` range (CGNAT) for pod IPs when Amazon VPC CNI custom networking is configured, preventing pod IP exhaustion in the primary VPC CIDR:

```bash
# Add CGNAT range for EKS pods
aws ec2 associate-vpc-cidr-block \
  --vpc-id $VPC_ID \
  --cidr-block 100.64.0.0/16

# After the secondary CIDR reaches the associated state, create a pod subnet in it
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 100.64.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=eks-pod-subnet-1a}]'
```

## Creating Subnets in the Secondary CIDR

```bash
# After the secondary CIDR is associated, create a new subnet using it
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 100.64.0.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=secondary-subnet-1a}]'
```

## Disassociating a Secondary CIDR

```bash
# Get the association ID first
ASSOC_ID=$(aws ec2 describe-vpcs \
  --vpc-ids $VPC_ID \
  --query 'Vpcs[0].CidrBlockAssociationSet[?CidrBlock==`100.64.0.0/16`].AssociationId' \
  --output text)

# Disassociate (fails if any subnets, gateways, or other resources still depend on that CIDR block)
aws ec2 disassociate-vpc-cidr-block --association-id $ASSOC_ID
```

## Conclusion

Adding a secondary CIDR extends VPC capacity without disruption. For Amazon EKS custom networking, use `100.64.0.0/10` (CGNAT space) for pod subnets to preserve the primary RFC 1918 space for instances and services. Always verify there is no overlap with peered VPCs before associating.
