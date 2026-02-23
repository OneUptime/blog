# How to Build a VPN Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, VPN, Networking, AWS, Security, Infrastructure Patterns

Description: Build secure VPN infrastructure with Terraform using AWS Client VPN, Site-to-Site VPN, and Transit Gateway for remote access and hybrid connectivity.

---

Whether your team works remotely and needs secure access to private resources, or your organization has on-premises data centers that need to connect to AWS, you need a VPN. Setting up VPN infrastructure involves certificates, routing, security groups, and authorization rules. Getting any of these wrong means either no connectivity or, worse, a security hole.

Terraform makes VPN infrastructure reproducible and auditable. In this guide, we will build two types of VPN: a Client VPN for remote worker access and a Site-to-Site VPN for connecting on-premises networks to AWS.

## Client VPN for Remote Access

AWS Client VPN gives your team secure access to private VPC resources from their laptops:

### Certificate Infrastructure

Client VPN needs TLS certificates. You can use AWS Certificate Manager Private CA or bring your own certificates:

```hcl
# ACM Private CA for VPN certificates
resource "aws_acmpca_certificate_authority" "vpn" {
  certificate_authority_configuration {
    key_algorithm     = "RSA_2048"
    signing_algorithm = "SHA256WITHRSA"

    subject {
      common_name  = "${var.project_name} VPN CA"
      organization = var.organization_name
    }
  }

  type = "ROOT"

  tags = {
    Name = "${var.project_name}-vpn-ca"
  }
}

# Server certificate for the VPN endpoint
resource "aws_acm_certificate" "vpn_server" {
  domain_name               = "vpn.${var.domain_name}"
  certificate_authority_arn = aws_acmpca_certificate_authority.vpn.arn

  lifecycle {
    create_before_destroy = true
  }
}
```

### Client VPN Endpoint

```hcl
resource "aws_ec2_client_vpn_endpoint" "main" {
  description            = "${var.project_name} Client VPN"
  server_certificate_arn = aws_acm_certificate.vpn_server.arn
  client_cidr_block      = "10.100.0.0/16" # IP range for VPN clients

  authentication_options {
    type                       = "certificate-authentication"
    root_certificate_chain_arn = aws_acmpca_certificate_authority.vpn.arn
  }

  connection_log_options {
    enabled               = true
    cloudwatch_log_group  = aws_cloudwatch_log_group.vpn.name
    cloudwatch_log_stream = aws_cloudwatch_log_stream.vpn.name
  }

  # Enable split tunneling so only VPC traffic goes through VPN
  split_tunnel = true

  # DNS servers - use the VPC DNS
  dns_servers = [cidrhost(var.vpc_cidr, 2)]

  transport_protocol = "udp"
  vpn_port           = 443

  security_group_ids = [aws_security_group.vpn.id]
  vpc_id             = var.vpc_id

  tags = {
    Name = "${var.project_name}-client-vpn"
  }
}

# Associate the VPN endpoint with subnets
resource "aws_ec2_client_vpn_network_association" "main" {
  count                  = length(var.private_subnet_ids)
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  subnet_id              = var.private_subnet_ids[count.index]
}

# Authorization rule - allow access to VPC CIDR
resource "aws_ec2_client_vpn_authorization_rule" "vpc" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  target_network_cidr    = var.vpc_cidr
  authorize_all_groups   = true
  description            = "Allow access to VPC"
}

# If you need internet access through the VPN
resource "aws_ec2_client_vpn_route" "internet" {
  count                  = var.allow_internet_access ? length(var.private_subnet_ids) : 0
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  destination_cidr_block = "0.0.0.0/0"
  target_vpc_subnet_id   = var.private_subnet_ids[count.index]
}
```

### VPN Security Group

```hcl
resource "aws_security_group" "vpn" {
  name_prefix = "${var.project_name}-vpn-"
  vpc_id      = var.vpc_id
  description = "Security group for Client VPN"

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
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = {
    Name = "${var.project_name}-vpn-sg"
  }
}
```

### VPN Logging

```hcl
resource "aws_cloudwatch_log_group" "vpn" {
  name              = "/aws/vpn/${var.project_name}"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.vpn.arn
}

resource "aws_cloudwatch_log_stream" "vpn" {
  name           = "connections"
  log_group_name = aws_cloudwatch_log_group.vpn.name
}
```

## Site-to-Site VPN

For connecting on-premises networks to AWS, use Site-to-Site VPN:

```hcl
# Customer Gateway represents your on-premises VPN device
resource "aws_customer_gateway" "onprem" {
  bgp_asn    = var.onprem_bgp_asn
  ip_address = var.onprem_vpn_ip
  type       = "ipsec.1"

  tags = {
    Name = "${var.project_name}-onprem-cgw"
  }
}

# Virtual Private Gateway attaches to your VPC
resource "aws_vpn_gateway" "main" {
  vpc_id          = var.vpc_id
  amazon_side_asn = var.aws_bgp_asn

  tags = {
    Name = "${var.project_name}-vgw"
  }
}

# The VPN connection itself
resource "aws_vpn_connection" "onprem" {
  customer_gateway_id = aws_customer_gateway.onprem.id
  vpn_gateway_id      = aws_vpn_gateway.main.id
  type                = "ipsec.1"

  # Enable acceleration for better performance
  enable_acceleration = true

  # Tunnel configuration
  tunnel1_ike_versions                 = ["ikev2"]
  tunnel1_phase1_dh_group_numbers      = [14, 15, 16]
  tunnel1_phase1_encryption_algorithms = ["AES256-GCM-16"]
  tunnel1_phase1_integrity_algorithms  = ["SHA2-256"]
  tunnel1_phase2_dh_group_numbers      = [14, 15, 16]
  tunnel1_phase2_encryption_algorithms = ["AES256-GCM-16"]
  tunnel1_phase2_integrity_algorithms  = ["SHA2-256"]

  tunnel2_ike_versions                 = ["ikev2"]
  tunnel2_phase1_dh_group_numbers      = [14, 15, 16]
  tunnel2_phase1_encryption_algorithms = ["AES256-GCM-16"]
  tunnel2_phase1_integrity_algorithms  = ["SHA2-256"]
  tunnel2_phase2_dh_group_numbers      = [14, 15, 16]
  tunnel2_phase2_encryption_algorithms = ["AES256-GCM-16"]
  tunnel2_phase2_integrity_algorithms  = ["SHA2-256"]

  tags = {
    Name = "${var.project_name}-s2s-vpn"
  }
}

# Enable route propagation so VPC learns on-premises routes
resource "aws_vpn_gateway_route_propagation" "private" {
  count          = length(var.private_route_table_ids)
  vpn_gateway_id = aws_vpn_gateway.main.id
  route_table_id = var.private_route_table_ids[count.index]
}
```

## Site-to-Site VPN with Transit Gateway

For larger environments, attach the VPN to a Transit Gateway instead of a VPC:

```hcl
resource "aws_vpn_connection" "tgw" {
  customer_gateway_id = aws_customer_gateway.onprem.id
  transit_gateway_id  = var.transit_gateway_id
  type                = "ipsec.1"
  enable_acceleration = true

  tags = {
    Name = "${var.project_name}-tgw-vpn"
  }
}
```

This gives all VPCs connected to the Transit Gateway access to on-premises resources, which pairs well with a [hub-and-spoke network](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-hub-and-spoke-network-with-terraform/view).

## Monitoring VPN Health

Keep track of VPN tunnel status with CloudWatch alarms:

```hcl
resource "aws_cloudwatch_metric_alarm" "tunnel_down" {
  alarm_name          = "${var.project_name}-vpn-tunnel-down"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TunnelState"
  namespace           = "AWS/VPN"
  period              = 300
  statistic           = "Maximum"
  threshold           = 1
  alarm_description   = "VPN tunnel is down"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    VpnId = aws_vpn_connection.onprem.id
  }
}
```

## Wrapping Up

VPN infrastructure is critical for secure connectivity, whether for remote workers or hybrid cloud setups. The Terraform approach we covered handles both scenarios: Client VPN for remote access and Site-to-Site VPN for data center connectivity. Everything is defined in code, including certificates, tunnel configuration, routing, and monitoring. This means your VPN setup is reproducible, auditable, and can be tested before rolling out to production.
