# How to Set Up WireGuard VPN on Cloud VMs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, WireGuard, VPN, AWS, Networking, Infrastructure as Code

Description: Learn how to provision WireGuard VPN servers on AWS EC2 instances using OpenTofu for lightweight, high-performance encrypted tunnels.

## Introduction

WireGuard is a modern, fast, and secure VPN protocol. Running it on cloud VMs gives you full control over your VPN infrastructure at minimal cost. OpenTofu provisions the EC2 instance, security groups, and Elastic IP, while user data scripts configure WireGuard.

## Security Group

```hcl
resource "aws_security_group" "wireguard" {
  name        = "${var.app_name}-wireguard"
  description = "WireGuard VPN server"
  vpc_id      = var.vpc_id

  ingress {
    description = "WireGuard UDP"
    from_port   = 51820
    to_port     = 51820
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name      = "wireguard-sg"
    ManagedBy = "opentofu"
  }
}
```

## WireGuard Server Instance

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "wireguard" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t3.micro"
  subnet_id              = var.public_subnet_id
  vpc_security_group_ids = [aws_security_group.wireguard.id]
  key_name               = var.key_pair_name

  # Install and configure WireGuard on first boot
  user_data = templatefile("${path.module}/scripts/wireguard-setup.sh.tpl", {
    server_private_key = var.wg_server_private_key
    server_address     = "10.99.0.1/24"
    client_public_key  = var.wg_client_public_key
    client_allowed_ip  = "10.99.0.2/32"
    listen_port        = 51820
  })

  tags = {
    Name        = "${var.app_name}-wireguard"
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}

resource "aws_eip" "wireguard" {
  instance = aws_instance.wireguard.id
  domain   = "vpc"

  tags = {
    Name = "${var.app_name}-wireguard-eip"
  }
}
```

## WireGuard Setup Script

```bash
#!/bin/bash
# scripts/wireguard-setup.sh.tpl

apt-get update -y
apt-get install -y wireguard

# Enable IP forwarding
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
sysctl -p

# Create WireGuard configuration
cat > /etc/wireguard/wg0.conf <<WGCONF
[Interface]
Address = ${server_address}
ListenPort = ${listen_port}
PrivateKey = ${server_private_key}

# Client peer
[Peer]
PublicKey = ${client_public_key}
AllowedIPs = ${client_allowed_ip}
WGCONF

chmod 600 /etc/wireguard/wg0.conf

# Start WireGuard and enable on boot
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0
```

## Generating Keys

```bash
# Generate server key pair
wg genkey | tee server-private.key | wg pubkey > server-public.key

# Generate client key pair
wg genkey | tee client-private.key | wg pubkey > client-public.key
```

## Variables and Outputs

```hcl
variable "wg_server_private_key" {
  type      = string
  sensitive = true
}

variable "wg_client_public_key" {
  type = string
}

output "wireguard_public_ip" {
  value = aws_eip.wireguard.public_ip
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

WireGuard on cloud VMs provides a lightweight, high-performance VPN solution that you fully control. OpenTofu provisions the VM, security groups, and Elastic IP, while cloud-init configures WireGuard - giving you a complete, reproducible VPN deployment.
