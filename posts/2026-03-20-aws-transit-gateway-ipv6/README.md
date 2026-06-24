# How to Configure AWS Transit Gateway for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Transit Gateway, IPv6, VPC, Cloud Networking, Dual-Stack, BGP

Description: Configure AWS Transit Gateway to route IPv6 traffic between dual-stack VPCs, on-premises networks, and the internet using dual-stack attachments and route tables.

## Introduction

AWS Transit Gateway (TGW) acts as a regional network hub connecting multiple VPCs and on-premises networks. It supports IPv6 through dual-stack attachments and route tables. Each dual-stack VPC attachment can carry both IPv4 and IPv6 traffic when IPv6 support is enabled.

## Step 1: Create a Transit Gateway

```bash
# Create TGW

TGW_ID=$(aws ec2 create-transit-gateway \
    --description "Dual-stack TGW" \
    --options \
        DefaultRouteTableAssociation=enable,\
        DefaultRouteTablePropagation=enable,\
        MulticastSupport=disable,\
        AutoAcceptSharedAttachments=disable \
    --query 'TransitGateway.TransitGatewayId' \
    --output text)

echo "TGW ID: $TGW_ID"

# Wait for available state
aws ec2 wait transit-gateway-available --transit-gateway-ids $TGW_ID
```

## Step 2: Attach a Dual-Stack VPC

```bash
# Get VPC and subnet IDs
VPC_ID="vpc-0123456789abcdef0"
SUBNET_IDS=("subnet-0123456789abcdef0" "subnet-fedcba9876543210f")

# Create dual-stack TGW attachment
TGW_ATTACH_ID=$(aws ec2 create-transit-gateway-vpc-attachment \
    --transit-gateway-id $TGW_ID \
    --vpc-id $VPC_ID \
    --subnet-ids "${SUBNET_IDS[@]}" \
    --options \
        DnsSupport=enable,\
        Ipv6Support=enable,\
        ApplianceModeSupport=disable \
    --query 'TransitGatewayVpcAttachment.TransitGatewayAttachmentId' \
    --output text)

echo "Attachment ID: $TGW_ATTACH_ID"
```

## Step 3: Configure IPv6 Route Tables

```bash
# Get default TGW route table
TGW_RT_ID=$(aws ec2 describe-transit-gateway-route-tables \
    --filters "Name=transit-gateway-id,Values=$TGW_ID" \
              "Name=state,Values=available" \
    --query 'TransitGatewayRouteTables[0].TransitGatewayRouteTableId' \
    --output text)

# Add a static IPv6 route when you are not relying on propagation
PEER_ATTACH_ID="tgw-attach-0123456789abcdef0"

aws ec2 create-transit-gateway-route \
    --destination-cidr-block "2001:db8:2::/56" \
    --transit-gateway-route-table-id $TGW_RT_ID \
    --transit-gateway-attachment-id $PEER_ATTACH_ID

# For BGP-based VPN or Direct Connect attachments, enable propagation
ON_PREM_ATTACH_ID="tgw-attach-fedcba9876543210f"

aws ec2 enable-transit-gateway-route-table-propagation \
    --transit-gateway-route-table-id $TGW_RT_ID \
    --transit-gateway-attachment-id $ON_PREM_ATTACH_ID

# List IPv6 routes in TGW route table
aws ec2 search-transit-gateway-routes \
    --transit-gateway-route-table-id $TGW_RT_ID \
    --filters "Name=type,Values=static,propagated"
```

## Step 4: VPC Route Tables for IPv6

```bash
# Update VPC route table to route remote IPv6 prefixes through TGW
VPC_RT_ID="rtb-0123456789abcdef0"

# Route a peer VPC IPv6 prefix to TGW
aws ec2 create-route \
    --route-table-id $VPC_RT_ID \
    --destination-ipv6-cidr-block "2001:db8:2::/56" \
    --transit-gateway-id $TGW_ID

# Or route an on-premises IPv6 prefix to TGW
aws ec2 create-route \
    --route-table-id $VPC_RT_ID \
    --destination-ipv6-cidr-block "2001:db8:100::/48" \
    --transit-gateway-id $TGW_ID
```

## Step 5: Terraform Configuration

```hcl
# main.tf

resource "aws_ec2_transit_gateway" "main" {
  description = "Dual-stack TGW"
  
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"

  tags = {
    Name = "main-tgw"
  }
}

resource "aws_ec2_transit_gateway_vpc_attachment" "vpc_a" {
  subnet_ids         = var.vpc_a_subnets
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = var.vpc_a_id

  ipv6_support = "enable"  # Enable IPv6 on attachment

  tags = {
    Name = "vpc-a-attachment"
  }
}

resource "aws_ec2_transit_gateway_vpc_attachment" "vpc_b" {
  subnet_ids         = var.vpc_b_subnets
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = var.vpc_b_id

  ipv6_support = "enable"
  transit_gateway_default_route_table_propagation = false

  tags = {
    Name = "vpc-b-attachment"
  }
}

resource "aws_ec2_transit_gateway_route" "vpc_b_ipv6" {
  destination_cidr_block         = "2001:db8:2::/56"
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.vpc_b.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway.main.association_default_route_table_id
}
```

## Step 6: Verify IPv6 Connectivity

```bash
# Test IPv6 routing through TGW between VPCs
# From an EC2 instance in VPC A
ping -6 -c 3 2001:db8:2:1::10

# Check TGW route propagation
aws ec2 get-transit-gateway-route-table-propagations \
    --transit-gateway-route-table-id $TGW_RT_ID

# View a specific IPv6 route in TGW route table
aws ec2 search-transit-gateway-routes \
    --transit-gateway-route-table-id $TGW_RT_ID \
    --filters "Name=route-search.exact-match,Values=2001:db8:2::/56"
```

## Conclusion

AWS Transit Gateway enables IPv6 routing between VPCs and on-premises networks by enabling `Ipv6Support=enable` on each VPC attachment and then either propagating IPv6 routes from BGP-based attachments or adding specific IPv6 routes to TGW and VPC route tables. Terraform's `ipv6_support = "enable"` makes this declarative. Monitor TGW attachment health and IPv6 route propagation with OneUptime's network connectivity checks between VPCs.
