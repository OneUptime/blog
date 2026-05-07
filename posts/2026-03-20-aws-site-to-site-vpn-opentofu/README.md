# How to Create AWS Site-to-Site VPN Connections with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Site-to-Site VPN, Networking, Hybrid Cloud, Infrastructure as Code

Description: Learn how to create AWS Site-to-Site VPN connections between your VPC and on-premises network using Virtual Private Gateways and Customer Gateways with OpenTofu.

## Introduction

AWS Site-to-Site VPN creates two encrypted IPsec tunnels between your AWS VPC and on-premises data center or branch office. OpenTofu manages Virtual Private Gateways, Customer Gateways, VPN connections, and route propagation as code.

## Creating a Virtual Private Gateway

```hcl
# Virtual Private Gateway (AWS side of the connection)

resource "aws_vpn_gateway" "main" {
  amazon_side_asn = 64512  # BGP ASN for AWS side

  tags = {
    Name        = "${var.app_name}-vgw"
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}

# Attach the VGW to the VPC
resource "aws_vpn_gateway_attachment" "main" {
  vpc_id         = var.vpc_id
  vpn_gateway_id = aws_vpn_gateway.main.id
}
```

## Creating a Customer Gateway

```hcl
# Customer Gateway represents the on-premises VPN device
resource "aws_customer_gateway" "onprem" {
  bgp_asn    = 65000          # your on-premises BGP ASN
  ip_address = var.onprem_public_ip  # public IP of your VPN device
  type       = "ipsec.1"

  tags = {
    Name = "on-premises-gateway"
  }
}
```

## Creating the VPN Connection

```hcl
resource "aws_vpn_connection" "main" {
  vpn_gateway_id      = aws_vpn_gateway.main.id
  customer_gateway_id = aws_customer_gateway.onprem.id
  type                = "ipsec.1"

  # Leave this false for BGP dynamic routing; set to true only for devices that don't support BGP
  static_routes_only = false

  # Custom IKE and IPsec settings
  tunnel1_ike_versions           = ["ikev2"]
  tunnel1_phase1_encryption_algorithms = ["AES256"]
  tunnel1_phase1_integrity_algorithms  = ["SHA2-256"]
  tunnel1_phase1_dh_group_numbers      = [14]

  tunnel2_ike_versions           = ["ikev2"]
  tunnel2_phase1_encryption_algorithms = ["AES256"]
  tunnel2_phase1_integrity_algorithms  = ["SHA2-256"]
  tunnel2_phase1_dh_group_numbers      = [14]

  tags = {
    Name        = "${var.app_name}-vpn"
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Static Routes

```hcl
# Add a static route for each on-premises CIDR only when static_routes_only = true
resource "aws_vpn_connection_route" "onprem_cidr" {
  vpn_connection_id      = aws_vpn_connection.main.id
  destination_cidr_block = var.onprem_cidr  # e.g., 192.168.0.0/24
}
```

## Route Propagation

Enable the VGW to propagate routes to your VPC route tables.

```hcl
resource "aws_vpn_gateway_route_propagation" "private" {
  route_table_id = var.private_route_table_id
  vpn_gateway_id = aws_vpn_gateway.main.id
}
```

## Outputs

```hcl
output "vpn_tunnel1_address" {
  description = "Outside IP address for VPN tunnel 1 – configure on your VPN device"
  value       = aws_vpn_connection.main.tunnel1_address
}

output "vpn_tunnel2_address" {
  description = "Outside IP address for VPN tunnel 2"
  value       = aws_vpn_connection.main.tunnel2_address
}

output "vpn_configuration" {
  description = "Customer gateway configuration in AWS XML format"
  value       = aws_vpn_connection.main.customer_gateway_configuration
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

AWS Site-to-Site VPN provides an encrypted, redundant connection between your VPC and on-premises network. OpenTofu manages the VGW, Customer Gateway, VPN connection parameters, and route propagation - giving you a version-controlled, reproducible hybrid connectivity configuration.
