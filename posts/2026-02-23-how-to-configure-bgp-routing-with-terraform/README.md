# How to Configure BGP Routing with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, BGP, Routing, Networking, AWS, Direct Connect, Infrastructure as Code

Description: Learn how to configure BGP routing with Terraform for AWS VPN connections, Direct Connect, and Transit Gateways with route filtering and AS path management.

---

BGP (Border Gateway Protocol) is the routing protocol that makes the internet work, and it is also what AWS uses for dynamic routing between your network and AWS. When you set up a Site-to-Site VPN or Direct Connect, BGP automatically exchanges route information between your on-premises network and AWS, so both sides know how to reach each other without static route maintenance.

In this guide, we will configure BGP routing with Terraform across different AWS services: VPN connections, Direct Connect, and Transit Gateways.

## BGP Fundamentals for AWS

Before diving into Terraform, here are the BGP concepts you need to understand:

- **ASN (Autonomous System Number)**: A unique identifier for a network. AWS uses private ASNs (64512-65534) and public ASNs.
- **BGP Peering**: Two BGP-speaking routers exchange routing information.
- **Route Advertisement**: Each side announces which CIDR blocks it can route to.
- **AS Path**: The list of ASNs a route has traversed, used for path selection.

## BGP with Site-to-Site VPN

When you create a VPN connection with `static_routes_only = false`, AWS automatically sets up BGP peering on both tunnels.

```hcl
# vpn-bgp.tf - VPN connection with BGP routing

# Virtual Private Gateway with custom ASN
resource "aws_vpn_gateway" "main" {
  vpc_id = aws_vpc.main.id

  # Use a custom AWS-side ASN
  # Default is 64512, but you can choose any private ASN
  amazon_side_asn = 64520

  tags = {
    Name = "${var.project_name}-vpn-gateway"
  }
}

# Customer Gateway with your on-premises ASN
resource "aws_customer_gateway" "onprem" {
  bgp_asn    = 65000 # Your on-premises ASN
  ip_address = var.onprem_public_ip
  type       = "ipsec.1"

  tags = {
    Name = "on-premises-router"
  }
}

# VPN connection with BGP enabled
resource "aws_vpn_connection" "main" {
  vpn_gateway_id      = aws_vpn_gateway.main.id
  customer_gateway_id = aws_customer_gateway.onprem.id
  type                = "ipsec.1"

  # Enable BGP
  static_routes_only = false

  # Inside tunnel CIDRs for BGP peering
  # AWS uses /30 subnets for the point-to-point links
  tunnel1_inside_cidr = "169.254.10.0/30"
  # AWS gets .1, your router gets .2
  # BGP peering: your router peers with 169.254.10.1

  tunnel2_inside_cidr = "169.254.11.0/30"
  # AWS gets .1, your router gets .2
  # BGP peering: your router peers with 169.254.11.1

  tags = {
    Name = "${var.project_name}-bgp-vpn"
  }
}

# Enable BGP route propagation to route tables
resource "aws_vpn_gateway_route_propagation" "private_subnets" {
  count = length(var.private_route_table_ids)

  vpn_gateway_id = aws_vpn_gateway.main.id
  route_table_id = var.private_route_table_ids[count.index]
}

# Output BGP peering details for on-premises configuration
output "bgp_peering_info" {
  value = {
    aws_asn = aws_vpn_gateway.main.amazon_side_asn

    tunnel1 = {
      aws_bgp_peer_ip   = cidrhost(aws_vpn_connection.main.tunnel1_inside_cidr, 1)
      onprem_bgp_peer_ip = cidrhost(aws_vpn_connection.main.tunnel1_inside_cidr, 2)
      outside_ip         = aws_vpn_connection.main.tunnel1_address
      bgp_asn            = aws_vpn_connection.main.tunnel1_bgp_asn
      bgp_holdtime       = aws_vpn_connection.main.tunnel1_bgp_holdtime
    }

    tunnel2 = {
      aws_bgp_peer_ip   = cidrhost(aws_vpn_connection.main.tunnel2_inside_cidr, 1)
      onprem_bgp_peer_ip = cidrhost(aws_vpn_connection.main.tunnel2_inside_cidr, 2)
      outside_ip         = aws_vpn_connection.main.tunnel2_address
      bgp_asn            = aws_vpn_connection.main.tunnel2_bgp_asn
      bgp_holdtime       = aws_vpn_connection.main.tunnel2_bgp_holdtime
    }
  }
}
```

## BGP with Direct Connect

Direct Connect uses BGP for exchanging routes between your data center and AWS over a dedicated physical connection.

```hcl
# direct-connect-bgp.tf - BGP over Direct Connect

# Direct Connect Gateway
resource "aws_dx_gateway" "main" {
  name            = "${var.project_name}-dx-gateway"
  amazon_side_asn = 64521 # Different ASN from VPN gateway
}

# Direct Connect Gateway association with VGW
resource "aws_dx_gateway_association" "main" {
  dx_gateway_id         = aws_dx_gateway.main.id
  associated_gateway_id = aws_vpn_gateway.main.id

  # Specify which CIDRs AWS should advertise to on-premises
  allowed_prefixes = [
    aws_vpc.main.cidr_block,
    aws_vpc.shared_services.cidr_block,
  ]
}

# Virtual Interface with BGP configuration
resource "aws_dx_private_virtual_interface" "main" {
  connection_id = var.dx_connection_id
  name          = "${var.project_name}-private-vif"

  dx_gateway_id = aws_dx_gateway.main.id
  vlan          = var.vlan_id

  # BGP configuration
  address_family = "ipv4"
  bgp_asn        = 65000 # Your on-premises ASN

  # Optional: Set specific BGP peering IPs
  amazon_address   = "169.254.100.1/30"
  customer_address = "169.254.100.2/30"

  # Optional: BGP authentication
  bgp_auth_key = var.bgp_auth_key

  tags = {
    Name = "${var.project_name}-private-vif"
  }
}

# Public virtual interface for accessing AWS public services
resource "aws_dx_public_virtual_interface" "main" {
  connection_id = var.dx_connection_id
  name          = "${var.project_name}-public-vif"

  vlan          = var.public_vlan_id
  address_family = "ipv4"
  bgp_asn       = 65000

  amazon_address   = "169.254.101.1/30"
  customer_address = "169.254.101.2/30"

  # Your public IP prefixes to advertise to AWS
  route_filter_prefixes = var.onprem_public_prefixes

  tags = {
    Name = "${var.project_name}-public-vif"
  }
}
```

## BGP with Transit Gateway

Transit Gateway provides more control over BGP routing with route tables and route filtering.

```hcl
# tgw-bgp.tf - BGP routing with Transit Gateway

resource "aws_ec2_transit_gateway" "main" {
  description = "${var.project_name} transit gateway"

  # Custom ASN for the transit gateway
  amazon_side_asn = 64522

  # Enable ECMP for load balancing across multiple VPN tunnels
  vpn_ecmp_support = "enable"

  # Enable route propagation
  default_route_table_association = "disable"
  default_route_table_propagation = "disable"

  tags = {
    Name = "${var.project_name}-tgw"
  }
}

# Separate route tables for different routing domains
resource "aws_ec2_transit_gateway_route_table" "production" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id

  tags = {
    Name = "production-routes"
  }
}

resource "aws_ec2_transit_gateway_route_table" "shared" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id

  tags = {
    Name = "shared-services-routes"
  }
}

resource "aws_ec2_transit_gateway_route_table" "onprem" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id

  tags = {
    Name = "on-premises-routes"
  }
}

# VPN connection on Transit Gateway
resource "aws_vpn_connection" "tgw_vpn" {
  customer_gateway_id = aws_customer_gateway.onprem.id
  transit_gateway_id  = aws_ec2_transit_gateway.main.id
  type                = "ipsec.1"
  static_routes_only  = false

  # Enable acceleration for better performance
  enable_acceleration = true

  tags = {
    Name = "${var.project_name}-tgw-vpn"
  }
}

# Associate VPN with the on-premises route table
resource "aws_ec2_transit_gateway_route_table_association" "vpn" {
  transit_gateway_attachment_id  = aws_vpn_connection.tgw_vpn.transit_gateway_attachment_id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.onprem.id
}

# Propagate VPN routes (from BGP) to the production route table
resource "aws_ec2_transit_gateway_route_table_propagation" "vpn_to_production" {
  transit_gateway_attachment_id  = aws_vpn_connection.tgw_vpn.transit_gateway_attachment_id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.production.id
}

# Propagate VPC routes to the on-premises route table
# This tells on-premises which AWS CIDRs are reachable
resource "aws_ec2_transit_gateway_route_table_propagation" "vpc_to_onprem" {
  for_each = var.vpc_attachments

  transit_gateway_attachment_id  = each.value.attachment_id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.onprem.id
}

# Static blackhole route to prevent routing loops
resource "aws_ec2_transit_gateway_route" "blackhole" {
  destination_cidr_block         = "10.255.0.0/16"
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.production.id
  blackhole                      = true
}
```

## Prefix Lists for Route Filtering

Use prefix lists to control which routes are accepted and advertised.

```hcl
# prefix-lists.tf - Route filtering
resource "aws_ec2_managed_prefix_list" "onprem_routes" {
  name           = "on-premises-routes"
  address_family = "IPv4"
  max_entries    = 20

  entry {
    cidr        = "192.168.0.0/16"
    description = "On-premises data center"
  }

  entry {
    cidr        = "172.16.0.0/12"
    description = "On-premises offices"
  }

  tags = {
    Purpose = "RouteFiltering"
  }
}

resource "aws_ec2_managed_prefix_list" "aws_routes" {
  name           = "aws-vpc-routes"
  address_family = "IPv4"
  max_entries    = 20

  entry {
    cidr        = aws_vpc.production.cidr_block
    description = "Production VPC"
  }

  entry {
    cidr        = aws_vpc.shared_services.cidr_block
    description = "Shared Services VPC"
  }

  tags = {
    Purpose = "RouteFiltering"
  }
}
```

## BGP Monitoring

Monitor BGP session health and route counts.

```hcl
# monitoring.tf - BGP monitoring
resource "aws_cloudwatch_metric_alarm" "bgp_session_down" {
  alarm_name          = "${var.project_name}-bgp-session-down"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TunnelState"
  namespace           = "AWS/VPN"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1

  dimensions = {
    VpnId = aws_vpn_connection.main.id
  }

  alarm_actions = [var.critical_alert_topic_arn]
  alarm_description = "BGP session is down - VPN tunnel inactive"
}

# Dashboard for BGP metrics
resource "aws_cloudwatch_dashboard" "bgp" {
  dashboard_name = "${var.project_name}-bgp-monitoring"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/VPN", "TunnelState", "VpnId", aws_vpn_connection.main.id,
             "TunnelIpAddress", aws_vpn_connection.main.tunnel1_address],
            ["AWS/VPN", "TunnelState", "VpnId", aws_vpn_connection.main.id,
             "TunnelIpAddress", aws_vpn_connection.main.tunnel2_address]
          ]
          title  = "BGP Tunnel State (1=UP, 0=DOWN)"
          period = 60
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/VPN", "TunnelDataIn", "VpnId", aws_vpn_connection.main.id],
            ["AWS/VPN", "TunnelDataOut", "VpnId", aws_vpn_connection.main.id]
          ]
          title  = "VPN Tunnel Data Transfer"
          period = 300
          stat   = "Sum"
        }
      }
    ]
  })
}
```

## Summary

BGP routing with Terraform gives you dynamic, self-maintaining connectivity between your on-premises network and AWS. Instead of managing static routes that break when network changes happen, BGP automatically discovers and advertises routes.

The key concepts are: ASN assignment (different for each endpoint), inside tunnel CIDRs (for the BGP peering sessions), and route propagation (how learned routes get into your VPC route tables).

For VPN connections, AWS handles the BGP speaker on its side. For Direct Connect, you have more control over the BGP configuration. And Transit Gateway gives you the most flexibility with multiple route tables and propagation rules.

Monitor your BGP sessions closely. A tunnel that appears up but has lost its BGP session will not route traffic correctly. [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) can help you monitor connectivity health and alert when BGP sessions drop.
