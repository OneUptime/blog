# How to Create AWS Client VPN Endpoints with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Client VPN, Networking, Security, Infrastructure as Code

Description: Learn how to create and configure AWS Client VPN endpoints for remote access to your VPC resources using OpenTofu.

## Introduction

AWS Client VPN provides managed VPN access for remote users to connect to AWS VPCs and on-premises networks. OpenTofu manages VPN endpoints, authentication, authorization rules, and network associations as code.

## Creating the Client VPN Endpoint

```hcl
resource "aws_ec2_client_vpn_endpoint" "main" {
  description            = "${var.app_name} Client VPN"
  server_certificate_arn = var.server_certificate_arn
  client_cidr_block      = "10.100.0.0/16"  # CIDR for VPN clients (must not overlap with VPC)

  # Mutual TLS authentication
  authentication_options {
    type                       = "certificate-authentication"
    root_certificate_chain_arn = var.client_root_certificate_arn
  }

  # Or use Active Directory authentication
  # authentication_options {
  #   type                = "directory-service-authentication"
  #   active_directory_id = var.active_directory_id
  # }

  connection_log_options {
    enabled               = true
    cloudwatch_log_group  = aws_cloudwatch_log_group.vpn.name
    cloudwatch_log_stream = aws_cloudwatch_log_stream.vpn.name
  }

  # With split tunnel, only routes in the Client VPN route table go through the VPN
  split_tunnel = true

  dns_servers        = [cidrhost(var.vpc_cidr, 2)]  # AmazonProvidedDNS for the VPC
  transport_protocol = "udp"                        # UDP is the default transport protocol

  tags = {
    Name        = "${var.app_name}-client-vpn"
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Associating with Subnets

Associate the VPN endpoint with subnets in different Availability Zones in your VPC.

```hcl
resource "aws_ec2_client_vpn_network_association" "subnet_1" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  subnet_id              = var.private_subnet_ids[0]
}

resource "aws_ec2_client_vpn_network_association" "subnet_2" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  subnet_id              = var.private_subnet_ids[1]
}
```

## Authorization Rules

```hcl
# Allow all authenticated users to access the VPC CIDR

resource "aws_ec2_client_vpn_authorization_rule" "vpc_access" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  target_network_cidr    = var.vpc_cidr
  authorize_all_groups   = true
  description            = "Allow all users to access VPC"
}

# Alternative: replace the broader all-users rule with a group-scoped rule when you need segmentation
# resource "aws_ec2_client_vpn_authorization_rule" "prod_db" {
#   client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
#   target_network_cidr    = "10.0.10.0/24"  # DB subnet
#   access_group_id        = var.dba_group_id
#   description            = "DBA group access to DB subnet"
# }
```

## CloudWatch Logging

```hcl
resource "aws_cloudwatch_log_group" "vpn" {
  name              = "/aws/vpn/${var.app_name}"
  retention_in_days = 90
}

resource "aws_cloudwatch_log_stream" "vpn" {
  name           = "connections"
  log_group_name = aws_cloudwatch_log_group.vpn.name
}
```

## Outputs

```hcl
output "client_vpn_endpoint_id" {
  value = aws_ec2_client_vpn_endpoint.main.id
}

output "vpn_dns_name" {
  description = "DNS name to use in client VPN configuration files"
  value       = aws_ec2_client_vpn_endpoint.main.dns_name
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

AWS Client VPN provides secure remote access to VPC resources. OpenTofu manages the entire setup - endpoint configuration, subnet associations, authorization rules, and CloudWatch logging - making your VPN infrastructure reproducible and auditable.
