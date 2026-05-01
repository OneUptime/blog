# How to Deploy Wireguard VPN with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, WireGuard, VPN, Network Security, AWS

Description: Learn how to deploy a WireGuard VPN server on AWS EC2 using OpenTofu for secure remote access to private resources in your VPC.

## Introduction

WireGuard is a modern, fast VPN protocol. This guide deploys a WireGuard server on an EC2 instance with Elastic IP, security groups, and automated configuration using cloud-init, providing secure remote access to private VPC resources.

## EC2 Instance with Elastic IP

```hcl
resource "aws_eip" "wireguard" {
  instance = aws_instance.wireguard.id
  domain   = "vpc"

  tags = { Name = "wireguard-eip-${var.environment}" }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "wireguard" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t3.small"
  key_name               = var.key_pair_name
  subnet_id              = var.public_subnet_id
  vpc_security_group_ids = [aws_security_group.wireguard.id]
  iam_instance_profile   = aws_iam_instance_profile.wireguard.name

  # Enable IP forwarding
  source_dest_check = false

  user_data = templatefile("${path.module}/wireguard-init.sh.tpl", {
    server_private_key = wireguard_asymmetric_key.server.private_key
    server_public_key  = wireguard_asymmetric_key.server.public_key
    listen_port        = 51820
    vpn_cidr           = "10.200.0.0/24"
    vpc_cidr           = var.vpc_cidr
    peers              = var.wireguard_peers
  })

  tags = {
    Name        = "wireguard-server-${var.environment}"
    Environment = var.environment
  }
}
```

## Security Group

```hcl
resource "aws_security_group" "wireguard" {
  name        = "wireguard-${var.environment}"
  description = "WireGuard VPN server security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 51820
    to_port     = 51820
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]  # WireGuard UDP port - open to internet
    description = "WireGuard VPN"
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_cidr_blocks
    description = "SSH admin access"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "wireguard-${var.environment}" }
}
```

## WireGuard Keys with the Wireguard Provider

```hcl
terraform {
  required_providers {
    wireguard = {
      source  = "OJFord/wireguard"
      version = "~> 0.4"
    }
  }
}

# Generate server keypair

resource "wireguard_asymmetric_key" "server" {}

# Generate client keypairs
resource "wireguard_asymmetric_key" "clients" {
  for_each = toset(var.client_names)
}

# Store server private key in Secrets Manager
resource "aws_secretsmanager_secret" "server_private_key" {
  name = "/wireguard/${var.environment}/server-private-key"
}

resource "aws_secretsmanager_secret_version" "server_private_key" {
  secret_id     = aws_secretsmanager_secret.server_private_key.id
  secret_string = wireguard_asymmetric_key.server.private_key
}
```

## Cloud-Init Configuration Template

```bash
# wireguard-init.sh.tpl
#!/bin/bash
apt-get update -y
apt-get install -y wireguard

install -d -m 700 /etc/wireguard
primary_iface="$(ip route show default | awk '/default/ {print $5; exit}')"

# Configure IP forwarding
echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.d/wireguard.conf
sysctl -p /etc/sysctl.d/wireguard.conf

cat > /etc/wireguard/wg0.conf << WGCONF
[Interface]
PrivateKey = ${server_private_key}
Address = 10.200.0.1/24
ListenPort = ${listen_port}
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o $primary_iface -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o $primary_iface -j MASQUERADE

%{ for peer in peers ~}
[Peer]
PublicKey = ${peer.public_key}
AllowedIPs = ${peer.ip}/32
%{ endfor ~}
WGCONF
chmod 600 /etc/wireguard/wg0.conf

systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0
```

## Generating Client Configurations

```hcl
output "client_configs" {
  sensitive = true
  value = {
    for name, key in wireguard_asymmetric_key.clients :
    name => <<-EOF
      [Interface]
      PrivateKey = ${key.private_key}
      Address = ${var.client_ips[name]}/24
      DNS = ${cidrhost(var.vpc_cidr, 2)}

      [Peer]
      PublicKey = ${wireguard_asymmetric_key.server.public_key}
      AllowedIPs = ${var.vpc_cidr}, 10.200.0.0/24
      Endpoint = ${aws_eip.wireguard.public_ip}:51820
      PersistentKeepalive = 25
    EOF
  }
}
```

## Conclusion

Deploying WireGuard with OpenTofu provides a modern, performant VPN for private VPC access. The wireguard provider generates cryptographic key pairs as managed resources, and this example also writes the server private key to Secrets Manager for retrieval on the AWS side. Because provider-generated private keys, Secrets Manager secret values, and `user_data` contents are still present in OpenTofu state or instance metadata, protect your state backend and instance access accordingly. Set `source_dest_check = false` on the EC2 instance to allow it to forward traffic to other VPC resources.
