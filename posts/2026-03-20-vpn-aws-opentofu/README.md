# How to Configure AWS VPN with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, VPN, AWS, Site-to-Site VPN, Networking, Infrastructure as Code

Description: Learn how to configure AWS Site-to-Site VPN using OpenTofu - setting up virtual private gateways, customer gateways, and VPN connections to connect on-premises networks to AWS.

## Introduction

AWS Site-to-Site VPN connects on-premises networks to AWS VPCs over IPsec tunnels. Each VPN connection has two tunnels for redundancy. OpenTofu manages the `aws_vpn_gateway` (AWS side), `aws_customer_gateway` (on-premises side), and `aws_vpn_connection` (the tunnel).

## Customer Gateway (On-Premises Device)

```hcl
# Customer Gateway represents the on-premises VPN device

resource "aws_customer_gateway" "on_prem" {
  bgp_asn    = var.on_prem_bgp_asn  # Your on-premises ASN (e.g., 65000)
  ip_address = var.on_prem_public_ip  # Public IP of your VPN device
  type       = "ipsec.1"

  tags = {
    Name = "on-prem-customer-gateway"
  }
}
```

## Virtual Private Gateway

```hcl
# Virtual Private Gateway (AWS VPN endpoint)
# Setting vpc_id here auto-attaches the VGW to the VPC.
# Use aws_vpn_gateway_attachment instead if you prefer to manage attachment separately;
# do not set both or they will conflict.
resource "aws_vpn_gateway" "main" {
  vpc_id          = aws_vpc.main.id
  amazon_side_asn = 64512  # AWS side BGP ASN (64512-65534)

  tags = {
    Name = "${var.environment}-vgw"
  }
}
```

## VPN Connection

```hcl
resource "aws_vpn_connection" "main" {
  vpn_gateway_id      = aws_vpn_gateway.main.id
  customer_gateway_id = aws_customer_gateway.on_prem.id
  type                = "ipsec.1"

  # Use BGP for dynamic routing (recommended)
  static_routes_only = false

  # Tunnel 1 configuration
  tunnel1_preshared_key          = var.tunnel1_psk
  tunnel1_ike_versions           = ["ikev2"]
  tunnel1_phase1_encryption_algorithms = ["AES256"]
  tunnel1_phase1_integrity_algorithms  = ["SHA2-256"]
  tunnel1_phase1_dh_group_numbers      = [14]
  tunnel1_phase2_encryption_algorithms = ["AES256"]
  tunnel1_phase2_integrity_algorithms  = ["SHA2-256"]
  tunnel1_phase2_dh_group_numbers      = [14]

  # Tunnel 2 configuration
  tunnel2_preshared_key          = var.tunnel2_psk
  tunnel2_ike_versions           = ["ikev2"]

  tags = {
    Name = "${var.environment}-vpn-connection"
  }
}
```

## Route Propagation

```hcl
# Propagate on-premises routes to route tables via BGP
resource "aws_vpn_gateway_route_propagation" "private" {
  vpn_gateway_id = aws_vpn_gateway.main.id
  route_table_id = aws_route_table.private.id
}

# For static routing (if static_routes_only = true)
resource "aws_vpn_connection_route" "office" {
  destination_cidr_block = var.on_prem_cidr
  vpn_connection_id      = aws_vpn_connection.main.id
}
```

## Monitoring with CloudWatch

```hcl
resource "aws_cloudwatch_metric_alarm" "vpn_tunnel1_down" {
  alarm_name          = "${var.environment}-vpn-tunnel1-down"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TunnelState"
  namespace           = "AWS/VPN"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1

  dimensions = {
    VpnId    = aws_vpn_connection.main.id
    TunnelIpAddress = aws_vpn_connection.main.tunnel1_address
  }

  alarm_description = "VPN Tunnel 1 is down"
  alarm_actions     = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "vpn_tunnel2_down" {
  alarm_name          = "${var.environment}-vpn-tunnel2-down"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TunnelState"
  namespace           = "AWS/VPN"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1

  dimensions = {
    VpnId    = aws_vpn_connection.main.id
    TunnelIpAddress = aws_vpn_connection.main.tunnel2_address
  }

  alarm_description = "VPN Tunnel 2 is down"
  alarm_actions     = [aws_sns_topic.alerts.arn]
}
```

## Outputs: VPN Configuration for On-Premises Device

```hcl
output "vpn_tunnel1_address" {
  value       = aws_vpn_connection.main.tunnel1_address
  description = "Tunnel 1 AWS endpoint IP"
}

output "vpn_tunnel2_address" {
  value       = aws_vpn_connection.main.tunnel2_address
  description = "Tunnel 2 AWS endpoint IP"
}

output "vpn_tunnel1_cgw_inside_address" {
  value       = aws_vpn_connection.main.tunnel1_cgw_inside_address
  description = "Tunnel 1 customer gateway inside IP (for BGP)"
}

output "vpn_tunnel1_vgw_inside_address" {
  value       = aws_vpn_connection.main.tunnel1_vgw_inside_address
  description = "Tunnel 1 VGW inside IP (for BGP)"
}

output "vpn_connection_configuration" {
  sensitive = true
  value     = aws_vpn_connection.main.customer_gateway_configuration
  description = "XML configuration for the customer gateway device"
}
```

## Conclusion

AWS Site-to-Site VPN with OpenTofu requires three resources: `aws_customer_gateway` for the on-premises device, `aws_vpn_gateway` for the AWS endpoint, and `aws_vpn_connection` to link them. Use BGP routing (`static_routes_only = false`) for automatic route exchange. Each VPN connection creates two tunnels for redundancy - monitor both with CloudWatch alarms and send alerts when either goes down. The `customer_gateway_configuration` output contains the XML configuration for popular VPN devices.
