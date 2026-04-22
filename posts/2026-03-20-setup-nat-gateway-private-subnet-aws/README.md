# How to Set Up a NAT Gateway for Private Subnet IPv4 Internet Access in AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, VPC, NAT Gateway, IPv4, Private Subnet, Internet Access

Description: Create an AWS NAT Gateway in a public subnet, allocate an Elastic IP, configure private subnet route tables to route outbound IPv4 traffic through the NAT Gateway.

## Introduction

A public NAT Gateway allows instances in private subnets to make outbound IPv4 connections to the internet (for software updates, API calls, etc.) while remaining unreachable from the internet. This zonal setup places the NAT Gateway in a public subnet and uses an Elastic IP.

## Step 1: Allocate an Elastic IP

```bash
# Allocate a static public IP for the NAT Gateway

EIP_ALLOC=$(aws ec2 allocate-address \
  --domain vpc \
  --query 'AllocationId' \
  --output text)

echo "EIP Allocation ID: $EIP_ALLOC"
```

## Step 2: Create the NAT Gateway

```bash
# Place NAT Gateway in a public subnet
PUBLIC_SUBNET_ID=subnet-0abc123def4567890

NAT_ID=$(aws ec2 create-nat-gateway \
  --subnet-id $PUBLIC_SUBNET_ID \
  --allocation-id $EIP_ALLOC \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=nat-1a}]' \
  --query 'NatGateway.NatGatewayId' \
  --output text)

echo "NAT Gateway: $NAT_ID"

# Wait for it to become available (takes a few minutes)
echo "Waiting for NAT Gateway to become available..."
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_ID
echo "NAT Gateway is ready"
```

## Step 3: Configure Private Subnet Route Table

```bash
VPC_ID=vpc-0123abc456def7890

# Create a private route table
PRIV_RT=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=private-rt-1a}]' \
  --query 'RouteTable.RouteTableId' \
  --output text)

# Route all outbound traffic through NAT Gateway
aws ec2 create-route \
  --route-table-id $PRIV_RT \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NAT_ID

# Associate private subnets
aws ec2 associate-route-table \
  --route-table-id $PRIV_RT \
  --subnet-id subnet-0123abc456def7890
```

## Step 4: Verify from a Private Instance

```bash
# SSH into a private instance via a bastion host or SSM
# Then test outbound internet access
curl -s https://checkip.amazonaws.com
# Should return the NAT Gateway's Elastic IP
```

## High Availability: Zonal NAT Gateway Per AZ

AWS also supports Regional NAT Gateways for automatic multi-AZ expansion. For zonal NAT Gateways, create one NAT Gateway per Availability Zone for HA:

```bash
# Create one NAT Gateway per AZ with its own EIP
for AZ in us-east-1a us-east-1b us-east-1c; do
    EIP=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text)
    PUB_SUBNET=$(aws ec2 describe-subnets \
      --filters "Name=vpc-id,Values=$VPC_ID" "Name=availabilityZone,Values=$AZ" "Name=tag:Name,Values=public-*" \
      --query 'Subnets[0].SubnetId' --output text)
    NAT=$(aws ec2 create-nat-gateway --subnet-id $PUB_SUBNET --allocation-id $EIP \
      --query 'NatGateway.NatGatewayId' --output text)
    echo "AZ: $AZ | NAT: $NAT"
done
```

## Cost Considerations

NAT Gateways charge per hour and per GB processed. For development/test environments, a single NAT Gateway for all AZs saves cost at the risk of cross-AZ traffic charges if a private instance is in a different AZ.

## Conclusion

NAT Gateways provide outbound-only internet access for private subnets. For zonal deployments, deploy one per AZ in production, place them in public subnets, and route private subnet traffic to them. Instances behind a public NAT appear on the internet with the NAT's Elastic IP.
