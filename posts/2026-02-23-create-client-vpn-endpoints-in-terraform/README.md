# How to Create Client VPN Endpoints in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Client VPN, Networking, Security, Infrastructure as Code

Description: Learn how to create AWS Client VPN endpoints with certificate-based and Active Directory authentication, split-tunnel, and authorization rules using Terraform.

---

AWS Client VPN is a managed VPN service that lets your users securely connect to AWS resources and on-premises networks from any location. Unlike Site-to-Site VPN which connects entire networks, Client VPN is designed for individual users connecting from laptops and mobile devices. Managing Client VPN endpoints through Terraform gives you reproducible configurations that you can deploy across multiple environments with consistent security settings.

This guide covers creating Client VPN endpoints with different authentication methods, configuring split-tunnel and full-tunnel modes, setting up authorization rules, and managing route tables.

## Prerequisites

- Terraform 1.0 or later
- AWS CLI configured with appropriate permissions
- A VPC with subnets for the VPN endpoint
- Server and client certificates (for mutual authentication)
- Active Directory or SAML IdP (for federated authentication)

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Generating Certificates with ACM

Client VPN requires a server certificate at minimum. For mutual authentication, you also need client certificates. You can use ACM Private CA or generate certificates externally and import them.

```hcl
# Import a server certificate into ACM
resource "aws_acm_certificate" "vpn_server" {
  private_key       = file("${path.module}/certs/server.key")
  certificate_body  = file("${path.module}/certs/server.crt")
  certificate_chain = file("${path.module}/certs/ca.crt")

  tags = {
    Purpose = "client-vpn-server"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Import a client root certificate for mutual authentication
resource "aws_acm_certificate" "vpn_client_root" {
  private_key       = file("${path.module}/certs/client-root.key")
  certificate_body  = file("${path.module}/certs/client-root.crt")
  certificate_chain = file("${path.module}/certs/ca.crt")

  tags = {
    Purpose = "client-vpn-client-root"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Basic Client VPN with Mutual Authentication

Mutual TLS authentication uses certificates on both sides - the server proves its identity to the client and the client proves its identity to the server.

```hcl
# CloudWatch log group for VPN connection logging
resource "aws_cloudwatch_log_group" "vpn" {
  name              = "/aws/client-vpn/production"
  retention_in_days = 30

  tags = {
    Service = "client-vpn"
  }
}

resource "aws_cloudwatch_log_stream" "vpn" {
  name           = "connection-log"
  log_group_name = aws_cloudwatch_log_group.vpn.name
}

# Security group for the VPN endpoint
resource "aws_security_group" "vpn" {
  name        = "client-vpn-sg"
  description = "Security group for Client VPN endpoint"
  vpc_id      = aws_vpc.main.id

  # Allow all traffic from VPN clients
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.100.0.0/16"] # VPN client CIDR
    description = "Allow all from VPN clients"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "client-vpn-sg"
  }
}

# Client VPN endpoint with mutual certificate authentication
resource "aws_ec2_client_vpn_endpoint" "mutual_auth" {
  description            = "Production Client VPN"
  server_certificate_arn = aws_acm_certificate.vpn_server.arn
  client_cidr_block      = "10.100.0.0/16"

  # Mutual certificate authentication
  authentication_options {
    type                       = "certificate-authentication"
    root_certificate_chain_arn = aws_acm_certificate.vpn_client_root.arn
  }

  connection_log_options {
    enabled               = true
    cloudwatch_log_group  = aws_cloudwatch_log_group.vpn.name
    cloudwatch_log_stream = aws_cloudwatch_log_stream.vpn.name
  }

  # Split tunnel - only VPC traffic goes through the VPN
  split_tunnel = true

  # Use TCP for environments where UDP is blocked
  transport_protocol = "udp"
  vpn_port           = 443

  # DNS servers for VPN clients
  dns_servers = ["10.0.0.2"] # VPC DNS resolver

  security_group_ids = [aws_security_group.vpn.id]
  vpc_id             = aws_vpc.main.id

  # Session timeout
  session_timeout_hours = 12

  # Enable self-service portal
  self_service_portal = "enabled"

  tags = {
    Name        = "production-client-vpn"
    Environment = "production"
  }
}
```

## Associating Subnets

You must associate at least one subnet with the VPN endpoint. Each association creates a network interface in that subnet.

```hcl
# Associate the VPN endpoint with private subnets
resource "aws_ec2_client_vpn_network_association" "private_a" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.mutual_auth.id
  subnet_id              = aws_subnet.private[0].id
}

resource "aws_ec2_client_vpn_network_association" "private_b" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.mutual_auth.id
  subnet_id              = aws_subnet.private[1].id
}
```

## Authorization Rules

Authorization rules control which networks VPN clients can access. Without rules, clients cannot reach anything even if they are connected.

```hcl
# Allow all VPN users to access the entire VPC
resource "aws_ec2_client_vpn_authorization_rule" "vpc_access" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.mutual_auth.id
  target_network_cidr    = aws_vpc.main.cidr_block
  authorize_all_groups   = true
  description            = "Allow access to the VPC"
}

# Allow access to a peered VPC
resource "aws_ec2_client_vpn_authorization_rule" "peered_vpc" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.mutual_auth.id
  target_network_cidr    = "10.1.0.0/16" # Peered VPC CIDR
  authorize_all_groups   = true
  description            = "Allow access to peered VPC"
}

# Allow internet access through the VPN (when not using split tunnel)
resource "aws_ec2_client_vpn_authorization_rule" "internet" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.mutual_auth.id
  target_network_cidr    = "0.0.0.0/0"
  authorize_all_groups   = true
  description            = "Allow internet access"
}
```

## Adding Routes

Routes tell the VPN endpoint where to send traffic. VPC routes are added automatically when you associate subnets, but you need to add routes manually for other destinations.

```hcl
# Route for peered VPC traffic
resource "aws_ec2_client_vpn_route" "peered_vpc" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.mutual_auth.id
  destination_cidr_block = "10.1.0.0/16"
  target_vpc_subnet_id   = aws_subnet.private[0].id
  description            = "Route to peered VPC"

  depends_on = [aws_ec2_client_vpn_network_association.private_a]
}

# Route for internet access (when using full tunnel)
resource "aws_ec2_client_vpn_route" "internet" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.mutual_auth.id
  destination_cidr_block = "0.0.0.0/0"
  target_vpc_subnet_id   = aws_subnet.private[0].id
  description            = "Route for internet access"

  depends_on = [aws_ec2_client_vpn_network_association.private_a]
}
```

## Client VPN with Active Directory Authentication

For organizations using Active Directory, you can authenticate VPN users against a Managed Microsoft AD directory.

```hcl
# Client VPN with Active Directory authentication
resource "aws_ec2_client_vpn_endpoint" "ad_auth" {
  description            = "Client VPN with AD Authentication"
  server_certificate_arn = aws_acm_certificate.vpn_server.arn
  client_cidr_block      = "10.200.0.0/16"

  authentication_options {
    type                = "directory-service-authentication"
    active_directory_id = aws_directory_service_directory.main.id
  }

  connection_log_options {
    enabled               = true
    cloudwatch_log_group  = aws_cloudwatch_log_group.vpn.name
    cloudwatch_log_stream = aws_cloudwatch_log_stream.vpn.name
  }

  split_tunnel           = true
  transport_protocol     = "udp"
  vpn_port               = 443
  dns_servers            = aws_directory_service_directory.main.dns_ip_addresses
  security_group_ids     = [aws_security_group.vpn.id]
  vpc_id                 = aws_vpc.main.id
  session_timeout_hours  = 8

  tags = {
    Name = "ad-client-vpn"
  }
}

# AD-based authorization - only specific AD groups can access certain networks
resource "aws_ec2_client_vpn_authorization_rule" "dev_access" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.ad_auth.id
  target_network_cidr    = "10.0.0.0/16"
  access_group_id        = "S-1-5-21-xxxxxxxxxx-yyyyyyyyyy-zzzzzzzzzz-1234" # AD group SID
  description            = "Developers can access development VPC"
}

resource "aws_ec2_client_vpn_authorization_rule" "admin_all_access" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.ad_auth.id
  target_network_cidr    = "10.0.0.0/8"
  access_group_id        = "S-1-5-21-xxxxxxxxxx-yyyyyyyyyy-zzzzzzzzzz-5678" # Admin group SID
  description            = "Admins can access all private networks"
}
```

## Client VPN with SAML Federation

For SSO integration, use SAML-based authentication with your identity provider.

```hcl
# SAML identity provider for Client VPN
resource "aws_iam_saml_provider" "vpn" {
  name                   = "client-vpn-saml"
  saml_metadata_document = file("${path.module}/saml/metadata.xml")
}

# Self-service SAML provider (optional, for the self-service portal)
resource "aws_iam_saml_provider" "vpn_self_service" {
  name                   = "client-vpn-self-service"
  saml_metadata_document = file("${path.module}/saml/self-service-metadata.xml")
}

# Client VPN with SAML authentication
resource "aws_ec2_client_vpn_endpoint" "saml_auth" {
  description            = "Client VPN with SAML SSO"
  server_certificate_arn = aws_acm_certificate.vpn_server.arn
  client_cidr_block      = "10.150.0.0/16"

  authentication_options {
    type                           = "federated-authentication"
    saml_provider_arn              = aws_iam_saml_provider.vpn.arn
    self_service_saml_provider_arn = aws_iam_saml_provider.vpn_self_service.arn
  }

  connection_log_options {
    enabled               = true
    cloudwatch_log_group  = aws_cloudwatch_log_group.vpn.name
    cloudwatch_log_stream = aws_cloudwatch_log_stream.vpn.name
  }

  split_tunnel           = true
  transport_protocol     = "udp"
  vpn_port               = 443
  security_group_ids     = [aws_security_group.vpn.id]
  vpc_id                 = aws_vpc.main.id
  session_timeout_hours  = 8
  self_service_portal    = "enabled"

  tags = {
    Name = "saml-client-vpn"
  }
}
```

## Combined Authentication

You can require both certificate and directory/SAML authentication for stronger security.

```hcl
# Dual authentication: certificate + SAML
resource "aws_ec2_client_vpn_endpoint" "dual_auth" {
  description            = "Client VPN with dual authentication"
  server_certificate_arn = aws_acm_certificate.vpn_server.arn
  client_cidr_block      = "10.180.0.0/16"

  # First factor: mutual certificate authentication
  authentication_options {
    type                       = "certificate-authentication"
    root_certificate_chain_arn = aws_acm_certificate.vpn_client_root.arn
  }

  # Second factor: SAML federated authentication
  authentication_options {
    type              = "federated-authentication"
    saml_provider_arn = aws_iam_saml_provider.vpn.arn
  }

  connection_log_options {
    enabled               = true
    cloudwatch_log_group  = aws_cloudwatch_log_group.vpn.name
    cloudwatch_log_stream = aws_cloudwatch_log_stream.vpn.name
  }

  split_tunnel           = true
  security_group_ids     = [aws_security_group.vpn.id]
  vpc_id                 = aws_vpc.main.id
  session_timeout_hours  = 8

  tags = {
    Name = "dual-auth-client-vpn"
  }
}
```

## Client VPN with Banner

Display a login banner to users when they connect.

```hcl
# Client VPN with a login banner
resource "aws_ec2_client_vpn_endpoint" "with_banner" {
  description            = "Client VPN with login banner"
  server_certificate_arn = aws_acm_certificate.vpn_server.arn
  client_cidr_block      = "10.160.0.0/16"

  authentication_options {
    type                       = "certificate-authentication"
    root_certificate_chain_arn = aws_acm_certificate.vpn_client_root.arn
  }

  connection_log_options {
    enabled               = true
    cloudwatch_log_group  = aws_cloudwatch_log_group.vpn.name
    cloudwatch_log_stream = aws_cloudwatch_log_stream.vpn.name
  }

  # Login banner displayed to users
  client_login_banner_options {
    enabled     = true
    banner_text = "This VPN is for authorized use only. All activity is monitored and logged. By connecting, you agree to the company acceptable use policy."
  }

  split_tunnel           = true
  security_group_ids     = [aws_security_group.vpn.id]
  vpc_id                 = aws_vpc.main.id
  session_timeout_hours  = 8

  tags = {
    Name = "banner-client-vpn"
  }
}
```

## Outputs

```hcl
output "vpn_endpoint_id" {
  value       = aws_ec2_client_vpn_endpoint.mutual_auth.id
  description = "Client VPN endpoint ID"
}

output "vpn_dns_name" {
  value       = aws_ec2_client_vpn_endpoint.mutual_auth.dns_name
  description = "Client VPN DNS name for connection"
}

output "vpn_self_service_portal_url" {
  value       = aws_ec2_client_vpn_endpoint.mutual_auth.self_service_portal_url
  description = "URL for the self-service portal where users download their VPN configuration"
}
```

## Best Practices

1. **Use split tunnel for most use cases.** Split tunnel only routes VPC-destined traffic through the VPN, reducing bandwidth costs and improving internet performance for users. Use full tunnel only when you need to inspect all traffic.

2. **Enable connection logging.** CloudWatch logs give you visibility into who connected, when, and what they accessed. This is essential for security audits.

3. **Use dual authentication for production.** Requiring both a client certificate and SAML/AD authentication provides two-factor security.

4. **Associate multiple subnets for HA.** Each subnet association provides a VPN connection path. Multiple subnets across AZs give you redundancy.

5. **Use AD group-based authorization.** When using Active Directory, restrict network access by AD group rather than granting access to all authenticated users.

6. **Set reasonable session timeouts.** Eight hours works well for a workday. Do not leave sessions open indefinitely.

## Conclusion

AWS Client VPN with Terraform gives you a managed remote access solution that scales with your team. Whether you use certificate-based authentication for simplicity, Active Directory for enterprise integration, or SAML for SSO, the endpoint configuration stays in version control. Authorization rules and routes ensure users only reach the networks they should, and connection logging gives you a complete audit trail.
