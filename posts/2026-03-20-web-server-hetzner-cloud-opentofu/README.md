# How to Set Up a Web Server on Hetzner Cloud with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Hetzner Cloud, Nginx, Web Server, Infrastructure as Code

Description: Learn how to provision a complete Nginx web server setup on Hetzner Cloud using OpenTofu with firewall rules, floating IP, and cloud-init configuration.

This guide walks through creating a production-ready web server on Hetzner Cloud using OpenTofu. It covers the network stack, firewall, server, floating IP, and cloud-init Nginx installation in a single coherent configuration.

## Complete Web Server Configuration

```hcl
# versions.tf

terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

variable "hcloud_token"    { type = string; sensitive = true }
variable "ssh_public_key"  { type = string }
variable "domain_name"     { type = string; default = "example.com" }
```

## SSH Key

```hcl
resource "hcloud_ssh_key" "web" {
  name       = "web-server-key"
  public_key = var.ssh_public_key
}
```

## Firewall

```hcl
resource "hcloud_firewall" "web" {
  name = "web-server-firewall"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "icmp"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction         = "out"
    protocol          = "tcp"
    port              = "all"
    destination_ips   = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction         = "out"
    protocol          = "udp"
    port              = "all"
    destination_ips   = ["0.0.0.0/0", "::/0"]
  }
}
```

## Floating IP

```hcl
resource "hcloud_floating_ip" "web" {
  name          = "web-public-ip"
  type          = "ipv4"
  home_location = "nbg1"
}
```

## Server with Cloud-Init Nginx Setup

```hcl
resource "hcloud_server" "web" {
  name        = "web-01"
  image       = "ubuntu-24.04"
  server_type = "cx22"
  location    = "nbg1"
  ssh_keys    = [hcloud_ssh_key.web.id]
  firewall_ids = [hcloud_firewall.web.id]

  user_data = templatefile("nginx-init.yaml", {
    domain     = var.domain_name
    floating_ip = hcloud_floating_ip.web.ip_address
  })
}
```

```yaml
# nginx-init.yaml
#cloud-config
packages:
  - nginx
  - certbot
  - python3-certbot-nginx

write_files:
  - path: /etc/nginx/sites-available/default
    content: |
      server {
          listen 80;
          server_name ${domain};
          location / {
              root /var/www/html;
              index index.html;
          }
      }

runcmd:
  # Configure floating IP on loopback
  - ip addr add ${floating_ip}/32 dev lo
  - echo "auto lo:0\niface lo:0 inet static\n  address ${floating_ip}\n  netmask 255.255.255.255" >> /etc/network/interfaces.d/floating-ip.cfg
  - systemctl enable nginx
  - systemctl start nginx
```

## Floating IP Assignment

```hcl
resource "hcloud_floating_ip_assignment" "web" {
  floating_ip_id = hcloud_floating_ip.web.id
  server_id      = hcloud_server.web.id
}
```

## Outputs

```hcl
output "server_ip"    { value = hcloud_server.web.ipv4_address }
output "floating_ip"  { value = hcloud_floating_ip.web.ip_address }
output "ssh_command"  { value = "ssh root@${hcloud_floating_ip.web.ip_address}" }
```

## Conclusion

This configuration provisions a complete Hetzner Cloud web server stack in one `tofu apply`. The floating IP provides a stable public address that survives server replacements. Cloud-init installs Nginx on first boot and configures the server to respond on the floating IP. After provisioning, update your DNS records to point to the floating IP and use Certbot to add TLS.
