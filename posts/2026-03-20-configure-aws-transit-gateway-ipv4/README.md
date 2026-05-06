# How to Configure AWS Transit Gateway for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Transit Gateway, VPC, Networking, IPv4, OpenTofu

Description: Learn how to set up an AWS Transit Gateway to connect multiple VPCs and on-premises networks using IPv4 routing.

---

AWS Transit Gateway acts as a hub router that connects VPCs and VPN connections. Instead of creating a full mesh of VPC peering connections, you attach all networks to the Transit Gateway and manage routing centrally.

---

## Create the Transit Gateway

```hcl
resource "aws_ec2_transit_gateway" "main" {
  description                     = "Main transit gateway"
  amazon_side_asn                 = 64512
  auto_accept_shared_attachments  = "enable"
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"

  tags = {
    Name = "main-tgw"
  }
}
```

---

## Attach VPCs to the Transit Gateway

```hcl
resource "aws_ec2_transit_gateway_vpc_attachment" "vpc_a" {
  # Use one subnet per Availability Zone for the attachment.
  subnet_ids         = aws_subnet.vpc_a_private[*].id
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.vpc_a.id

  # This attachment will use a custom TGW route table below.
  transit_gateway_default_route_table_association = false

  tags = {
    Name = "tgw-attachment-vpc-a"
  }
}

resource "aws_ec2_transit_gateway_vpc_attachment" "vpc_b" {
  # Use one subnet per Availability Zone for the attachment.
  subnet_ids         = aws_subnet.vpc_b_private[*].id
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.vpc_b.id

  tags = {
    Name = "tgw-attachment-vpc-b"
  }
}
```

---

## Add Routes in VPC Route Tables

```hcl
# Route in VPC A pointing to VPC B via TGW

resource "aws_route" "vpc_a_to_vpc_b" {
  route_table_id         = aws_route_table.vpc_a_private.id
  destination_cidr_block = aws_vpc.vpc_b.cidr_block
  transit_gateway_id     = aws_ec2_transit_gateway.main.id
}

# Route in VPC B pointing to VPC A via TGW
resource "aws_route" "vpc_b_to_vpc_a" {
  route_table_id         = aws_route_table.vpc_b_private.id
  destination_cidr_block = aws_vpc.vpc_a.cidr_block
  transit_gateway_id     = aws_ec2_transit_gateway.main.id
}
```

---

## Create a Custom Route Table for Segmentation

```hcl
resource "aws_ec2_transit_gateway_route_table" "production" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  tags = {
    Name = "production-rt"
  }
}

resource "aws_ec2_transit_gateway_route_table_association" "vpc_a_production" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.vpc_a.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.production.id
}

resource "aws_ec2_transit_gateway_route" "prod_to_vpc_b" {
  destination_cidr_block         = aws_vpc.vpc_b.cidr_block
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.vpc_b.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.production.id
}
```

---

## Verify Connectivity

```bash
# Check TGW route tables
aws ec2 describe-transit-gateway-route-tables   --filters Name=transit-gateway-id,Values=tgw-0abc123

# Describe routes
aws ec2 search-transit-gateway-routes   --transit-gateway-route-table-id tgw-rtb-0abc123   --filters Name=type,Values=static
```

---

## Summary

Create an `aws_ec2_transit_gateway`, attach VPCs with `aws_ec2_transit_gateway_vpc_attachment`, and add routes in each VPC's route table pointing to the TGW for cross-VPC CIDRs. Use custom TGW route tables with `aws_ec2_transit_gateway_route_table`, explicitly associate attachments with `aws_ec2_transit_gateway_route_table_association`, and add TGW routes to implement network segmentation between environments.
