# How to Configure AWS Transit Gateway with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Transit Gateway, AWS, Networking, VPC, Infrastructure as Code

Description: Learn how to configure AWS Transit Gateway using OpenTofu - attaching VPCs, creating route tables, configuring VPN attachments, and managing inter-VPC routing at scale.

## Introduction

AWS Transit Gateway is a network hub that connects VPCs, VPN connections, and Direct Connect gateways. It replaces complex VPC peering meshes with a hub-and-spoke model. OpenTofu manages TGW resources including the gateway itself, VPC attachments, route tables, and route table associations.

## Transit Gateway

```hcl
resource "aws_ec2_transit_gateway" "main" {
  description                     = "${var.environment} Transit Gateway"
  amazon_side_asn                 = 64512
  auto_accept_shared_attachments  = "disable"  # Require explicit acceptance
  default_route_table_association = "disable"   # Use custom route tables
  default_route_table_propagation = "disable"
  dns_support                     = "enable"
  vpn_ecmp_support                = "enable"
  multicast_support               = "disable"

  tags = {
    Name        = "${var.environment}-tgw"
    Environment = var.environment
  }
}
```

## VPC Attachments

```hcl
locals {
  vpc_attachments = {
    shared_services = {
      vpc_id     = aws_vpc.shared.id
      subnet_ids = aws_subnet.shared_tgw[*].id
    }
    app1 = {
      vpc_id     = aws_vpc.app1.id
      subnet_ids = [aws_subnet.app1_tgw.id]
    }
    app2 = {
      vpc_id     = aws_vpc.app2.id
      subnet_ids = [aws_subnet.app2_tgw.id]
    }
  }
}

resource "aws_ec2_transit_gateway_vpc_attachment" "main" {
  for_each = local.vpc_attachments

  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = each.value.vpc_id
  subnet_ids         = each.value.subnet_ids

  dns_support                                     = "enable"
  transit_gateway_default_route_table_association = false
  transit_gateway_default_route_table_propagation = false

  tags = {
    Name = "${each.key}-tgw-attachment"
  }
}
```

## Route Tables

```hcl
# Shared services route table - shared services can reach app VPCs

resource "aws_ec2_transit_gateway_route_table" "shared" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  tags               = { Name = "shared-services-rt" }
}

# Application route table - app VPCs can only reach shared services
resource "aws_ec2_transit_gateway_route_table" "apps" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  tags               = { Name = "apps-rt" }
}

# Associate attachments with route tables
resource "aws_ec2_transit_gateway_route_table_association" "shared" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.main["shared_services"].id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.shared.id
}

resource "aws_ec2_transit_gateway_route_table_association" "apps" {
  for_each = { for k, v in local.vpc_attachments : k => v if k != "shared_services" }

  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.main[each.key].id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.apps.id
}

# Propagate shared services routes to app route table
resource "aws_ec2_transit_gateway_route_table_propagation" "shared_to_apps" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.main["shared_services"].id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.apps.id
}

# Propagate app routes to shared services route table
resource "aws_ec2_transit_gateway_route_table_propagation" "apps_to_shared" {
  for_each = { for k, v in local.vpc_attachments : k => v if k != "shared_services" }

  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.main[each.key].id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.shared.id
}
```

## VPN Attachment

```hcl
resource "aws_vpn_connection" "on_prem" {
  transit_gateway_id  = aws_ec2_transit_gateway.main.id
  customer_gateway_id = aws_customer_gateway.on_prem.id
  type                = "ipsec.1"
  static_routes_only  = false

  tags = { Name = "on-prem-vpn" }
}

# Associate VPN attachment with apps route table
resource "aws_ec2_transit_gateway_route_table_association" "vpn" {
  transit_gateway_attachment_id  = aws_vpn_connection.on_prem.transit_gateway_attachment_id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.apps.id
}
```

## VPC Route Tables: Point to TGW

```hcl
# App VPCs route private 10/8 traffic through TGW
resource "aws_route" "app1_to_tgw" {
  route_table_id         = aws_route_table.app1_private.id
  destination_cidr_block = "10.0.0.0/8"  # Private 10/8 via TGW
  transit_gateway_id     = aws_ec2_transit_gateway.main.id

  depends_on = [aws_ec2_transit_gateway_vpc_attachment.main]
}
```

## TGW Sharing with RAM (Resource Access Manager)

```hcl
# Share TGW with other AWS accounts in the organization
resource "aws_ram_resource_share" "tgw" {
  name                      = "${var.environment}-tgw-share"
  allow_external_principals = false  # Only share within organization

  tags = { Name = "${var.environment}-tgw-share" }
}

resource "aws_ram_resource_association" "tgw" {
  resource_arn       = aws_ec2_transit_gateway.main.arn
  resource_share_arn = aws_ram_resource_share.tgw.id
}

resource "aws_ram_principal_association" "org" {
  principal          = var.aws_organization_arn
  resource_share_arn = aws_ram_resource_share.tgw.id
}
```

## Conclusion

AWS Transit Gateway with OpenTofu centralizes inter-VPC routing. Disable default route table association and propagation to use custom route tables that control exactly which VPCs can reach each other. Use separate route tables for different tiers (shared services vs. application VPCs) to enforce isolation. Share the TGW across accounts using RAM for multi-account architectures, and attach VPN connections directly to TGW for on-premises connectivity without managing VGWs per VPC.
