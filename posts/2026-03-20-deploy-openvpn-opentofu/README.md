# How to Deploy OpenVPN with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, OpenVPN, VPN, Network Security, AWS

Description: Learn how to deploy OpenVPN Access Server on AWS EC2 using OpenTofu for enterprise-grade VPN with user management, MFA support, and web-based client distribution.

## Introduction

OpenVPN Access Server provides a full-featured VPN with a web-based admin console, user management, and automatic client configuration distribution. This guide deploys OpenVPN Access Server on EC2 using the official AMI with security groups, Elastic IP addressing, and routed access to VPC resources.

## Data Source for Official OpenVPN AMI

```hcl
data "aws_ami" "openvpn" {
  most_recent = true
  owners      = ["aws-marketplace"]  # AWS Marketplace verified provider alias

  filter {
    name   = "name"
    values = ["OpenVPN Access Server Community Image-*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}
```

## EC2 Instance

```hcl
resource "aws_eip" "openvpn" {
  instance = aws_instance.openvpn.id
  domain   = "vpc"
  tags     = { Name = "openvpn-eip" }
}

resource "aws_instance" "openvpn" {
  ami                    = data.aws_ami.openvpn.id
  instance_type          = "t3.small"  # Supports up to ~10 concurrent users
  key_name               = var.key_pair_name
  subnet_id              = var.public_subnet_id
  vpc_security_group_ids = [aws_security_group.openvpn.id]
  iam_instance_profile   = aws_iam_instance_profile.openvpn.name

  # OpenVPN requires source/dest check disabled
  source_dest_check = false

  user_data = <<-EOF
    #!/bin/bash
    # Wait for OpenVPN to be configured
    sleep 30

    cd /usr/local/openvpn_as/scripts

    # Reset the default admin account as a local Access Server administrator
    ./sacli --user "openvpn" --key "prop_superuser" --value "true" UserPropPut
    ./sacli --user "openvpn" --key "user_auth_type" --value "local" UserPropPut
    ./sacli --user "openvpn" --new_pass "${var.openvpn_admin_password}" SetLocalPassword

    # Route the VPC CIDR through the VPN
    ./sacli --key "vpn.server.routing.private_network.0" \
      --value "${var.vpc_cidr}" ConfigPut

    # Keep internet traffic local to the client (split tunnel)
    ./sacli --key "vpn.client.routing.reroute_gw" \
      --value "false" ConfigPut

    # Restart service to apply config
    ./sacli start
  EOF

  tags = {
    Name        = "openvpn-server-${var.environment}"
    Environment = var.environment
  }
}
```

## Security Group

```hcl
resource "aws_security_group" "openvpn" {
  name        = "openvpn-${var.environment}"
  description = "OpenVPN Access Server security group"
  vpc_id      = var.vpc_id

  # OpenVPN UDP port
  ingress {
    from_port   = 1194
    to_port     = 1194
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "OpenVPN UDP"
  }

  # OpenVPN TCP port (fallback)
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "OpenVPN HTTPS/TCP"
  }

  # Admin web console
  ingress {
    from_port   = 943
    to_port     = 943
    protocol    = "tcp"
    cidr_blocks = var.admin_cidr_blocks
    description = "OpenVPN admin console"
  }

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_cidr_blocks
    description = "SSH"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "openvpn-${var.environment}" }
}
```

## Route Table for VPN Traffic

```hcl
# Add route to VPN server for private subnets that need to route back to VPN clients

resource "aws_route" "vpn_return" {
  for_each               = toset(var.private_route_table_ids)
  route_table_id         = each.value
  destination_cidr_block = "172.27.224.0/20"  # OpenVPN default client network
  network_interface_id   = aws_instance.openvpn.primary_network_interface_id
}
```

## Outputs

```hcl
output "openvpn_public_ip" {
  value       = aws_eip.openvpn.public_ip
  description = "OpenVPN server public IP for client connections"
}

output "admin_console_url" {
  value       = "https://${aws_eip.openvpn.public_ip}:943/admin"
  description = "OpenVPN admin console URL"
}

output "client_portal_url" {
  value       = "https://${aws_eip.openvpn.public_ip}:943"
  description = "Client self-service portal URL"
}
```

## DNS Record for VPN

```hcl
resource "aws_route53_record" "vpn" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "vpn.${var.domain_name}"
  type    = "A"
  ttl     = 300
  records = [aws_eip.openvpn.public_ip]
}
```

## Conclusion

OpenVPN Access Server on EC2 provides a feature-rich VPN with user self-service client download, web-based management, and LDAP/AD integration capabilities. The Elastic IP ensures a stable endpoint even after instance replacements. For production use, enable MFA through the admin console and consider using an RDS backend for HA configurations. The `source_dest_check = false` setting is essential when the instance must route VPN client subnets to VPC resources.
