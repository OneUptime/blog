# How to Create VPN Connections with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, VPN, AWS, Networking, Security, Infrastructure as Code

Description: Learn how to create VPN connections with Terraform including AWS Client VPN, Site-to-Site VPN, and transit gateway VPN attachments for secure remote access.

---

VPN connections are the backbone of secure communication between your cloud infrastructure and on-premises networks or remote users. Whether you need engineers to access private resources from home, or you need to connect your office network to AWS, Terraform lets you define these connections as code with proper version control and reproducibility.

In this guide, we will set up different types of VPN connections on AWS using Terraform: AWS Client VPN for remote user access, Site-to-Site VPN for office connectivity, and Transit Gateway VPN for complex multi-VPC architectures.

## VPN Types Overview

AWS offers three main VPN connection types:

- **AWS Client VPN**: Managed OpenVPN-based service for individual users
- **AWS Site-to-Site VPN**: IPsec tunnels between your on-premises network and AWS VPCs
- **Transit Gateway VPN**: Site-to-Site VPN attached to a Transit Gateway for multi-VPC routing

## AWS Client VPN for Remote Access

Client VPN lets your team access private VPC resources from anywhere. It uses mutual certificate authentication or integration with Active Directory.

```hcl
# client-vpn.tf - AWS Client VPN endpoint

# Generate server and client certificates using ACM
resource "aws_acm_certificate" "vpn_server" {
  private_key       = file("${path.module}/certs/server.key")
  certificate_body  = file("${path.module}/certs/server.crt")
  certificate_chain = file("${path.module}/certs/ca.crt")

  tags = {
    Name = "vpn-server-cert"
  }
}

resource "aws_acm_certificate" "vpn_client" {
  private_key       = file("${path.module}/certs/client.key")
  certificate_body  = file("${path.module}/certs/client.crt")
  certificate_chain = file("${path.module}/certs/ca.crt")

  tags = {
    Name = "vpn-client-cert"
  }
}

# Client VPN endpoint
resource "aws_ec2_client_vpn_endpoint" "main" {
  description            = "${var.project_name} Client VPN"
  server_certificate_arn = aws_acm_certificate.vpn_server.arn
  client_cidr_block      = var.vpn_client_cidr # e.g., "172.16.0.0/16"

  # Certificate-based authentication
  authentication_options {
    type                       = "certificate-authentication"
    root_certificate_chain_arn = aws_acm_certificate.vpn_client.arn
  }

  # Optional: Add SAML/SSO authentication
  # authentication_options {
  #   type                           = "federated-authentication"
  #   saml_provider_arn              = aws_iam_saml_provider.vpn.arn
  #   self_service_saml_provider_arn = aws_iam_saml_provider.vpn_self_service.arn
  # }

  connection_log_options {
    enabled               = true
    cloudwatch_log_group  = aws_cloudwatch_log_group.vpn.name
    cloudwatch_log_stream = aws_cloudwatch_log_stream.vpn.name
  }

  # DNS resolution
  dns_servers = ["10.0.0.2"] # VPC DNS server

  # Split tunnel - only route VPC traffic through VPN
  split_tunnel = true

  # Transport protocol
  transport_protocol = "udp"

  # VPN port
  vpn_port = 443

  # Enable self-service portal for users to download configs
  self_service_portal = "enabled"

  security_group_ids = [aws_security_group.vpn.id]
  vpc_id             = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-client-vpn"
  }
}

# Associate VPN with subnets
resource "aws_ec2_client_vpn_network_association" "main" {
  count = length(var.private_subnet_ids)

  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  subnet_id              = var.private_subnet_ids[count.index]
}

# Authorization rule - allow access to VPC CIDR
resource "aws_ec2_client_vpn_authorization_rule" "vpc" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  target_network_cidr    = aws_vpc.main.cidr_block
  authorize_all_groups   = true

  description = "Allow access to VPC"
}

# Authorization rule - allow internet access through VPN (if not split tunnel)
resource "aws_ec2_client_vpn_authorization_rule" "internet" {
  count = var.split_tunnel ? 0 : 1

  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  target_network_cidr    = "0.0.0.0/0"
  authorize_all_groups   = true

  description = "Allow internet access"
}

# Route for VPC access
resource "aws_ec2_client_vpn_route" "vpc" {
  count = length(var.private_subnet_ids)

  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  destination_cidr_block = aws_vpc.main.cidr_block
  target_vpc_subnet_id   = var.private_subnet_ids[count.index]

  description = "Route to VPC"
}
```

## Security Group for VPN

```hcl
# security.tf - VPN security group
resource "aws_security_group" "vpn" {
  name_prefix = "client-vpn-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "VPN client connections"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "Access to VPC resources"
  }

  tags = {
    Name = "${var.project_name}-vpn-sg"
  }
}
```

## Site-to-Site VPN

For connecting your on-premises network to AWS, use a Site-to-Site VPN connection.

```hcl
# site-to-site.tf - IPsec VPN tunnel

# Virtual Private Gateway (AWS side)
resource "aws_vpn_gateway" "main" {
  vpc_id          = aws_vpc.main.id
  amazon_side_asn = var.aws_asn # e.g., 64512

  tags = {
    Name = "${var.project_name}-vpn-gateway"
  }
}

# Enable route propagation
resource "aws_vpn_gateway_route_propagation" "private" {
  count = length(aws_route_table.private)

  vpn_gateway_id = aws_vpn_gateway.main.id
  route_table_id = aws_route_table.private[count.index].id
}

# Customer Gateway (on-premises side)
resource "aws_customer_gateway" "office" {
  bgp_asn    = var.office_bgp_asn # e.g., 65000
  ip_address = var.office_public_ip
  type       = "ipsec.1"

  tags = {
    Name     = "${var.project_name}-office-gateway"
    Location = "Main Office"
  }
}

# VPN connection
resource "aws_vpn_connection" "office" {
  vpn_gateway_id      = aws_vpn_gateway.main.id
  customer_gateway_id = aws_customer_gateway.office.id
  type                = "ipsec.1"

  # Use static routing or BGP
  static_routes_only = false # Use BGP for dynamic routing

  # Tunnel options
  tunnel1_ike_versions                 = ["ikev2"]
  tunnel1_phase1_dh_group_numbers      = [14, 15, 16]
  tunnel1_phase1_encryption_algorithms = ["AES256"]
  tunnel1_phase1_integrity_algorithms  = ["SHA2-256"]
  tunnel1_phase2_dh_group_numbers      = [14, 15, 16]
  tunnel1_phase2_encryption_algorithms = ["AES256"]
  tunnel1_phase2_integrity_algorithms  = ["SHA2-256"]

  tunnel2_ike_versions                 = ["ikev2"]
  tunnel2_phase1_dh_group_numbers      = [14, 15, 16]
  tunnel2_phase1_encryption_algorithms = ["AES256"]
  tunnel2_phase1_integrity_algorithms  = ["SHA2-256"]
  tunnel2_phase2_dh_group_numbers      = [14, 15, 16]
  tunnel2_phase2_encryption_algorithms = ["AES256"]
  tunnel2_phase2_integrity_algorithms  = ["SHA2-256"]

  tags = {
    Name = "${var.project_name}-office-vpn"
  }
}
```

## Transit Gateway VPN

For multi-VPC architectures, attach the VPN to a Transit Gateway.

```hcl
# transit-gateway-vpn.tf - VPN via Transit Gateway
resource "aws_ec2_transit_gateway" "main" {
  description                     = "${var.project_name} transit gateway"
  amazon_side_asn                 = var.tgw_asn
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"
  vpn_ecmp_support                = "enable"

  tags = {
    Name = "${var.project_name}-tgw"
  }
}

# Attach VPCs to transit gateway
resource "aws_ec2_transit_gateway_vpc_attachment" "vpcs" {
  for_each = var.vpc_attachments

  subnet_ids         = each.value.subnet_ids
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = each.value.vpc_id

  tags = {
    Name = "${each.key}-tgw-attachment"
  }
}

# Customer gateway for on-premises
resource "aws_customer_gateway" "datacenter" {
  bgp_asn    = var.datacenter_bgp_asn
  ip_address = var.datacenter_public_ip
  type       = "ipsec.1"

  tags = {
    Name = "datacenter-gateway"
  }
}

# VPN connection attached to transit gateway
resource "aws_vpn_connection" "datacenter" {
  customer_gateway_id = aws_customer_gateway.datacenter.id
  transit_gateway_id  = aws_ec2_transit_gateway.main.id
  type                = "ipsec.1"

  static_routes_only = false

  tags = {
    Name = "datacenter-vpn"
  }
}
```

## VPN Logging and Monitoring

```hcl
# monitoring.tf - VPN monitoring
resource "aws_cloudwatch_log_group" "vpn" {
  name              = "/vpn/${var.project_name}"
  retention_in_days = 90
}

resource "aws_cloudwatch_log_stream" "vpn" {
  name           = "client-vpn-connections"
  log_group_name = aws_cloudwatch_log_group.vpn.name
}

# Monitor VPN tunnel status
resource "aws_cloudwatch_metric_alarm" "tunnel_down" {
  alarm_name          = "${var.project_name}-vpn-tunnel-down"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TunnelState"
  namespace           = "AWS/VPN"
  period              = 300
  statistic           = "Maximum"
  threshold           = 1

  dimensions = {
    VpnId = aws_vpn_connection.office.id
  }

  alarm_actions = [var.alert_sns_topic_arn]
  alarm_description = "VPN tunnel is down"
}

# Monitor VPN data transfer
resource "aws_cloudwatch_metric_alarm" "vpn_traffic" {
  alarm_name          = "${var.project_name}-vpn-no-traffic"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 6
  metric_name         = "TunnelDataIn"
  namespace           = "AWS/VPN"
  period              = 300
  statistic           = "Sum"
  threshold           = 1

  dimensions = {
    VpnId = aws_vpn_connection.office.id
  }

  alarm_actions = [var.alert_sns_topic_arn]
  alarm_description = "No traffic on VPN for 30 minutes"
}
```

## Summary

VPN connections built with Terraform give you secure, reproducible connectivity between your cloud and on-premises environments. Client VPN handles remote user access with certificate or SAML authentication. Site-to-Site VPN provides IPsec tunnels for office connectivity. And Transit Gateway VPN scales to connect multiple VPCs to your on-premises network.

The most important monitoring points are tunnel state (up or down) and traffic flow. A tunnel that shows no traffic might indicate a routing problem even if the tunnel itself is technically up.

For monitoring VPN connectivity and getting alerted when tunnels go down, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) can track VPN health and ensure your teams always have access to the resources they need.
