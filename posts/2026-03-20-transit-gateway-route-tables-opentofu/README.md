# How to Set Up Transit Gateway Route Tables with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Transit Gateway, Networking, Infrastructure as Code, VPC, Routing

Description: Learn how to configure AWS Transit Gateway route tables, associations, and propagations to control traffic flow between VPCs and on-premises networks using OpenTofu.

## Introduction

AWS Transit Gateway acts as a network hub connecting multiple VPCs and on-premises networks. Route tables on the Transit Gateway control how traffic is forwarded between attachments. This guide walks through creating and configuring Transit Gateway route tables with OpenTofu.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with networking permissions
- Existing VPCs and subnet IDs for the Transit Gateway VPC attachments
- VPC subnet route table routes to the Transit Gateway for the destination CIDRs you want to reach
- VPN or Direct Connect gateway Transit Gateway attachment ID if you add the on-premises static route

## Step 1: Create the Transit Gateway

```hcl
# Create Transit Gateway with default route table disabled

# so we can manage route tables explicitly
resource "aws_ec2_transit_gateway" "main" {
  description                     = "Main Transit Gateway"
  default_route_table_association = "disable"
  default_route_table_propagation = "disable"

  tags = {
    Name        = "main-tgw"
    Environment = var.environment
  }
}
```

## Step 2: Attach VPCs to the Transit Gateway

```hcl
# Attach production VPC to the Transit Gateway
resource "aws_ec2_transit_gateway_vpc_attachment" "prod" {
  subnet_ids                                      = var.prod_subnet_ids
  transit_gateway_id                              = aws_ec2_transit_gateway.main.id
  vpc_id                                          = var.prod_vpc_id
  transit_gateway_default_route_table_association = false
  transit_gateway_default_route_table_propagation = false

  tags = {
    Name = "prod-tgw-attachment"
  }
}

# Attach shared services VPC
resource "aws_ec2_transit_gateway_vpc_attachment" "shared" {
  subnet_ids                                      = var.shared_subnet_ids
  transit_gateway_id                              = aws_ec2_transit_gateway.main.id
  vpc_id                                          = var.shared_vpc_id
  transit_gateway_default_route_table_association = false
  transit_gateway_default_route_table_propagation = false

  tags = {
    Name = "shared-tgw-attachment"
  }
}
```

## Step 3: Create Separate Route Tables

```hcl
# Route table for production VPCs
resource "aws_ec2_transit_gateway_route_table" "prod" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id

  tags = {
    Name = "prod-route-table"
  }
}

# Route table for shared services
resource "aws_ec2_transit_gateway_route_table" "shared" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id

  tags = {
    Name = "shared-services-route-table"
  }
}
```

## Step 4: Associate Attachments with Route Tables

```hcl
# Associate prod VPC with the prod route table
resource "aws_ec2_transit_gateway_route_table_association" "prod" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.prod.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.prod.id
}

# Associate shared services VPC with its route table
resource "aws_ec2_transit_gateway_route_table_association" "shared" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.shared.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.shared.id
}
```

## Step 5: Configure Route Propagations

```hcl
# Propagate prod VPC routes into the shared services route table
# so shared services can reach production resources
resource "aws_ec2_transit_gateway_route_table_propagation" "prod_to_shared" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.prod.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.shared.id
}

# Propagate shared services routes into the prod route table
resource "aws_ec2_transit_gateway_route_table_propagation" "shared_to_prod" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.shared.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.prod.id
}
```

## Step 6: Add Static Routes

```hcl
# Add a static route for on-premises CIDR in the prod route table
# pointing to the VPN or Direct Connect gateway attachment
resource "aws_ec2_transit_gateway_route" "onprem" {
  destination_cidr_block         = "10.0.0.0/8"
  transit_gateway_attachment_id  = var.onprem_attachment_id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.prod.id
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have configured Transit Gateway route tables with separate routing domains for production and shared services. Route table associations define which table a given attachment uses for routing lookups, while propagations dynamically inject CIDR routes. This pattern enables fine-grained traffic segmentation across your AWS network without VPC peering mesh complexity.
