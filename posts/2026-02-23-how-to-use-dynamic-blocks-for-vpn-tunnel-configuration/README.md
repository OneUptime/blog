# How to Use Dynamic Blocks for VPN Tunnel Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, AWS, VPN, Networking, Infrastructure as Code

Description: Learn how to configure AWS Site-to-Site VPN tunnels dynamically with Terraform using dynamic blocks for scalable and consistent VPN management.

---

AWS Site-to-Site VPN connections come with two tunnels by default for redundancy. Configuring these tunnels in Terraform involves setting pre-shared keys, CIDR ranges, phase 1 and phase 2 encryption settings, and Dead Peer Detection parameters. Dynamic blocks let you manage these settings consistently across multiple VPN connections.

## Basic VPN Connection

Let us start with a basic VPN setup:

```hcl
resource "aws_vpn_gateway" "main" {
  vpc_id = var.vpc_id

  tags = {
    Name = "main-vpn-gw"
  }
}

resource "aws_customer_gateway" "main" {
  bgp_asn    = var.customer_bgp_asn
  ip_address = var.customer_gateway_ip
  type       = "ipsec.1"

  tags = {
    Name = "main-customer-gw"
  }
}

resource "aws_vpn_connection" "main" {
  vpn_gateway_id      = aws_vpn_gateway.main.id
  customer_gateway_id = aws_customer_gateway.main.id
  type                = "ipsec.1"
  static_routes_only  = var.static_routes_only

  tags = {
    Name = "main-vpn"
  }
}
```

## Dynamic Tunnel Configuration

AWS VPN connections have two tunnels. Each tunnel has a set of configurable options. Use variables and direct configuration rather than dynamic blocks for the tunnel-level settings since they are fixed at two:

```hcl
variable "tunnel_configurations" {
  description = "Configuration for VPN tunnels"
  type = list(object({
    tunnel_cidr       = string
    preshared_key     = string
    dpd_timeout       = optional(number, 30)
    phase1_encryption = optional(list(string), ["AES256"])
    phase1_integrity  = optional(list(string), ["SHA2-256"])
    phase1_dh_groups  = optional(list(number), [14])
    phase1_lifetime   = optional(number, 28800)
    phase2_encryption = optional(list(string), ["AES256"])
    phase2_integrity  = optional(list(string), ["SHA2-256"])
    phase2_dh_groups  = optional(list(number), [14])
    phase2_lifetime   = optional(number, 3600)
    ike_versions      = optional(list(string), ["ikev2"])
    startup_action    = optional(string, "add")
  }))

  validation {
    condition     = length(var.tunnel_configurations) == 2
    error_message = "Exactly two tunnel configurations are required for a VPN connection."
  }
}

resource "aws_vpn_connection" "main" {
  vpn_gateway_id      = aws_vpn_gateway.main.id
  customer_gateway_id = aws_customer_gateway.main.id
  type                = "ipsec.1"
  static_routes_only  = var.static_routes_only

  # Tunnel 1 configuration
  tunnel1_inside_cidr                  = var.tunnel_configurations[0].tunnel_cidr
  tunnel1_preshared_key                = var.tunnel_configurations[0].preshared_key
  tunnel1_dpd_timeout_seconds          = var.tunnel_configurations[0].dpd_timeout
  tunnel1_phase1_encryption_algorithms = var.tunnel_configurations[0].phase1_encryption
  tunnel1_phase1_integrity_algorithms  = var.tunnel_configurations[0].phase1_integrity
  tunnel1_phase1_dh_group_numbers      = var.tunnel_configurations[0].phase1_dh_groups
  tunnel1_phase1_lifetime_seconds      = var.tunnel_configurations[0].phase1_lifetime
  tunnel1_phase2_encryption_algorithms = var.tunnel_configurations[0].phase2_encryption
  tunnel1_phase2_integrity_algorithms  = var.tunnel_configurations[0].phase2_integrity
  tunnel1_phase2_dh_group_numbers      = var.tunnel_configurations[0].phase2_dh_groups
  tunnel1_phase2_lifetime_seconds      = var.tunnel_configurations[0].phase2_lifetime
  tunnel1_ike_versions                 = var.tunnel_configurations[0].ike_versions
  tunnel1_startup_action               = var.tunnel_configurations[0].startup_action

  # Tunnel 2 configuration
  tunnel2_inside_cidr                  = var.tunnel_configurations[1].tunnel_cidr
  tunnel2_preshared_key                = var.tunnel_configurations[1].preshared_key
  tunnel2_dpd_timeout_seconds          = var.tunnel_configurations[1].dpd_timeout
  tunnel2_phase1_encryption_algorithms = var.tunnel_configurations[1].phase1_encryption
  tunnel2_phase1_integrity_algorithms  = var.tunnel_configurations[1].phase1_integrity
  tunnel2_phase1_dh_group_numbers      = var.tunnel_configurations[1].phase1_dh_groups
  tunnel2_phase1_lifetime_seconds      = var.tunnel_configurations[1].phase1_lifetime
  tunnel2_phase2_encryption_algorithms = var.tunnel_configurations[1].phase2_encryption
  tunnel2_phase2_integrity_algorithms  = var.tunnel_configurations[1].phase2_integrity
  tunnel2_phase2_dh_group_numbers      = var.tunnel_configurations[1].phase2_dh_groups
  tunnel2_phase2_lifetime_seconds      = var.tunnel_configurations[1].phase2_lifetime
  tunnel2_ike_versions                 = var.tunnel_configurations[1].ike_versions
  tunnel2_startup_action               = var.tunnel_configurations[1].startup_action

  tags = {
    Name = "main-vpn"
  }
}
```

## Dynamic Static Routes

When using static routing (not BGP), you need to configure the routes to your on-premises networks:

```hcl
variable "static_routes" {
  description = "Static routes for the VPN connection"
  type        = list(string)
  default = [
    "192.168.0.0/16",
    "172.16.0.0/12",
    "10.100.0.0/16"
  ]
}

resource "aws_vpn_connection_route" "static" {
  for_each = toset(var.static_routes)

  vpn_connection_id      = aws_vpn_connection.main.id
  destination_cidr_block = each.value
}
```

## Multiple VPN Connections

When you connect to multiple customer locations, dynamic generation across VPN connections is where things get interesting:

```hcl
variable "vpn_connections" {
  description = "Map of VPN connections to create"
  type = map(object({
    customer_gateway_ip = string
    customer_bgp_asn    = number
    static_routes_only  = bool
    static_routes       = optional(list(string), [])
    tunnel1_cidr        = string
    tunnel2_cidr        = string
    tunnel1_psk         = string
    tunnel2_psk         = string
  }))
}

# Customer gateways
resource "aws_customer_gateway" "vpns" {
  for_each = var.vpn_connections

  bgp_asn    = each.value.customer_bgp_asn
  ip_address = each.value.customer_gateway_ip
  type       = "ipsec.1"

  tags = {
    Name = "cgw-${each.key}"
  }
}

# VPN connections
resource "aws_vpn_connection" "vpns" {
  for_each = var.vpn_connections

  vpn_gateway_id      = aws_vpn_gateway.main.id
  customer_gateway_id = aws_customer_gateway.vpns[each.key].id
  type                = "ipsec.1"
  static_routes_only  = each.value.static_routes_only

  tunnel1_inside_cidr   = each.value.tunnel1_cidr
  tunnel1_preshared_key = each.value.tunnel1_psk
  tunnel2_inside_cidr   = each.value.tunnel2_cidr
  tunnel2_preshared_key = each.value.tunnel2_psk

  tags = {
    Name = "vpn-${each.key}"
  }
}

# Static routes for each VPN connection
locals {
  vpn_static_routes = flatten([
    for vpn_key, vpn in var.vpn_connections : [
      for route in vpn.static_routes : {
        key    = "${vpn_key}-${route}"
        vpn_id = aws_vpn_connection.vpns[vpn_key].id
        cidr   = route
      }
    ]
    if vpn.static_routes_only
  ])
}

resource "aws_vpn_connection_route" "all" {
  for_each = { for r in local.vpn_static_routes : r.key => r }

  vpn_connection_id      = each.value.vpn_id
  destination_cidr_block = each.value.cidr
}
```

## Route Propagation

VPN route propagation to route tables can also be managed dynamically:

```hcl
variable "route_table_ids" {
  description = "Route tables that should receive VPN routes"
  type        = list(string)
}

locals {
  # Create a combination of every VPN gateway + route table
  vpn_route_propagations = {
    for rt_id in var.route_table_ids : rt_id => {
      route_table_id = rt_id
      vpn_gateway_id = aws_vpn_gateway.main.id
    }
  }
}

resource "aws_vpn_gateway_route_propagation" "main" {
  for_each = local.vpn_route_propagations

  route_table_id = each.value.route_table_id
  vpn_gateway_id = each.value.vpn_gateway_id
}
```

## Transit Gateway VPN Attachments

For hub-and-spoke architectures using Transit Gateway, VPN attachments are another common pattern:

```hcl
variable "tgw_vpn_connections" {
  description = "VPN connections via Transit Gateway"
  type = map(object({
    customer_gateway_ip = string
    bgp_asn             = number
    tunnel1_cidr        = string
    tunnel2_cidr        = string
    transit_gateway_id  = string
  }))
}

resource "aws_customer_gateway" "tgw" {
  for_each = var.tgw_vpn_connections

  bgp_asn    = each.value.bgp_asn
  ip_address = each.value.customer_gateway_ip
  type       = "ipsec.1"

  tags = { Name = "cgw-tgw-${each.key}" }
}

resource "aws_vpn_connection" "tgw" {
  for_each = var.tgw_vpn_connections

  customer_gateway_id = aws_customer_gateway.tgw[each.key].id
  transit_gateway_id  = each.value.transit_gateway_id
  type                = "ipsec.1"

  tunnel1_inside_cidr = each.value.tunnel1_cidr
  tunnel2_inside_cidr = each.value.tunnel2_cidr

  tags = { Name = "vpn-tgw-${each.key}" }
}
```

## Monitoring VPN Tunnels

Create CloudWatch alarms for each VPN tunnel:

```hcl
locals {
  # Each VPN has two tunnels to monitor
  vpn_tunnel_alarms = flatten([
    for vpn_key, vpn in aws_vpn_connection.vpns : [
      for tunnel_idx in [1, 2] : {
        key     = "${vpn_key}-tunnel${tunnel_idx}"
        vpn_id  = vpn.id
        tunnel  = tunnel_idx
        ip      = tunnel_idx == 1 ? vpn.tunnel1_address : vpn.tunnel2_address
      }
    ]
  ])
}

resource "aws_cloudwatch_metric_alarm" "vpn_tunnel_status" {
  for_each = { for t in local.vpn_tunnel_alarms : t.key => t }

  alarm_name          = "vpn-tunnel-down-${each.key}"
  alarm_description   = "VPN tunnel ${each.value.tunnel} for ${each.key} is down"
  namespace           = "AWS/VPN"
  metric_name         = "TunnelState"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  period              = 300
  statistic           = "Average"
  threshold           = 1

  dimensions = {
    VpnId = each.value.vpn_id
  }

  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
}
```

## Outputs for Customer Configuration

Generate outputs that help the customer configure their side:

```hcl
output "vpn_configurations" {
  description = "VPN connection details for customer configuration"
  value = {
    for key, vpn in aws_vpn_connection.vpns : key => {
      vpn_id             = vpn.id
      tunnel1_address    = vpn.tunnel1_address
      tunnel1_inside_cidr = vpn.tunnel1_inside_cidr
      tunnel2_address    = vpn.tunnel2_address
      tunnel2_inside_cidr = vpn.tunnel2_inside_cidr
    }
  }
  sensitive = true
}
```

## Summary

VPN tunnel configuration in Terraform benefits from dynamic generation when managing multiple connections, static routes, route propagation, and monitoring alarms. While the tunnel settings themselves are not dynamic blocks (AWS VPN always has exactly two tunnels with dedicated attributes), the surrounding infrastructure - routes, alarms, customer gateways, and route propagation - scales well with `for_each`. For more networking patterns, see [how to use dynamic blocks for multi-AZ resource configuration](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-multi-az-resource-configuration/view).
