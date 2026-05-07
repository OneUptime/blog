# How to Configure AWS Client VPN with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Client VPN, Remote Access, Zero Trust, ACM, Infrastructure as Code

Description: Learn how to set up AWS Client VPN with OpenTofu to provide secure remote access to AWS VPC resources using mutual TLS certificate authentication or Active Directory.

## Introduction

AWS Client VPN is a managed OpenVPN-based service that enables employees to securely connect to AWS VPCs from remote locations. It supports mutual TLS (certificate) authentication, Active Directory authentication, and SAML-based SSO. Unlike EC2-based VPN servers, Client VPN scales automatically and doesn't require server management.

## Prerequisites

- OpenTofu v1.6+
- ACM certificate for the server and, for mutual TLS, optionally a client certificate in ACM if it was issued by a different CA
- AWS credentials with EC2 and Client VPN permissions

## Step 1: Create ACM Certificates for VPN

```hcl
# Server certificate for Client VPN

# Note: For mutual TLS, the server cert must be imported to ACM
# Import a client cert too only if it was issued by a different CA
# This typically requires generating certs with easy-rsa or similar tools

# Import server certificate (generated outside Terraform)
resource "aws_acm_certificate" "vpn_server" {
  private_key       = file("server.key")
  certificate_body  = file("server.crt")
  certificate_chain = file("ca.crt")

  tags = {
    Name = "${var.project_name}-vpn-server-cert"
  }
}

# Optional: only needed when client certs are issued by a different CA
resource "aws_acm_certificate" "vpn_client" {
  private_key       = file("client1.key")
  certificate_body  = file("client1.crt")
  certificate_chain = file("ca.crt")

  tags = {
    Name = "${var.project_name}-vpn-client-cert"
  }
}
```

## Step 2: Create Client VPN Endpoint

```hcl
resource "aws_ec2_client_vpn_endpoint" "main" {
  description            = "${var.project_name} Client VPN"
  server_certificate_arn = aws_acm_certificate.vpn_server.arn
  client_cidr_block      = "10.100.0.0/16"  # IP pool for VPN clients

  # Split tunnel: only route VPC traffic through VPN
  split_tunnel = true  # Set false to route all traffic through VPN

  # Mutual TLS authentication
  authentication_options {
    type                       = "certificate-authentication"
    # If the client cert was issued by the same CA as the server cert,
    # you can use aws_acm_certificate.vpn_server.arn here instead.
    root_certificate_chain_arn = aws_acm_certificate.vpn_client.arn
  }

  # Optional: Active Directory authentication
  # authentication_options {
  #   type                = "directory-service-authentication"
  #   active_directory_id = var.ad_directory_id
  # }

  connection_log_options {
    enabled               = true
    cloudwatch_log_group  = aws_cloudwatch_log_group.vpn.name
    cloudwatch_log_stream = aws_cloudwatch_log_stream.vpn.name
  }

  dns_servers = [var.vpc_dns_server]  # VPC's DNS resolver for internal name resolution

  transport_protocol = "udp"  # UDP for better performance, TCP as fallback

  vpc_id             = var.vpc_id
  security_group_ids = [aws_security_group.client_vpn.id]

  disconnect_on_session_timeout = true
  session_timeout_hours         = 8  # Require manual reconnect after 8 hours

  tags = {
    Name = "${var.project_name}-client-vpn"
  }
}

resource "aws_cloudwatch_log_group" "vpn" {
  name              = "/aws/client-vpn/${var.project_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_stream" "vpn" {
  name           = "connections"
  log_group_name = aws_cloudwatch_log_group.vpn.name
}
```

## Step 3: Associate with Subnets

```hcl
# Associate with each AZ subnet for high availability
resource "aws_ec2_client_vpn_network_association" "az1" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  subnet_id              = var.private_subnet_az1_id

  security_groups = [aws_security_group.client_vpn.id]
}

resource "aws_ec2_client_vpn_network_association" "az2" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  subnet_id              = var.private_subnet_az2_id

  security_groups = [aws_security_group.client_vpn.id]
}
```

## Step 4: Configure Authorization Rules

```hcl
# Allow all authenticated clients to access the VPC CIDR
resource "aws_ec2_client_vpn_authorization_rule" "vpc_access" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  target_network_cidr    = var.vpc_cidr
  authorize_all_groups   = true  # Allow all authenticated users

  description = "Allow VPN clients to access VPC"
}

# Restrict access to specific subnet based on AD group
# resource "aws_ec2_client_vpn_authorization_rule" "restricted" {
#   client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
#   target_network_cidr    = var.restricted_subnet_cidr
#   access_group_id        = var.ad_group_id
#   authorize_all_groups   = false
# }
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Download client configuration
aws ec2 export-client-vpn-client-configuration \
  --client-vpn-endpoint-id <endpoint-id> \
  --output text > client-config.ovpn

# Add the client certificate and private key to the .ovpn file for mutual TLS,
# then connect with an OpenVPN client
```

## Conclusion

Enable `split_tunnel = true` unless you need to route all internet traffic through the VPN. Split tunnel reduces VPN bandwidth requirements and improves performance for internet access. Configure `session_timeout_hours` with `disconnect_on_session_timeout = true` if you want users to reconnect periodically. Log all connections to CloudWatch to maintain an audit trail of who connected when and from where.
