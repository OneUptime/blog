# How to Configure Linode IPv6 with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linode, Akamai Cloud, Terraform, IPv6, Networking, Cloud

Description: A guide to provisioning Linode (Akamai Cloud) instances with IPv6 addressing and managing DNS AAAA records using Terraform.

Linode (now Akamai Cloud) automatically assigns a public IPv6 address to every Linode instance using SLAAC. Additional routed IPv6 ranges (/56 or /64) can be requested for a Linode. This guide covers IPv6 configuration with the Linode Terraform provider.

## Step 1: Configure the Linode Provider

```hcl
# provider.tf

terraform {
  required_providers {
    linode = {
      source  = "linode/linode"
      version = "~> 3.0"
    }
  }
}

provider "linode" {
  # Alternatively, omit this argument and set LINODE_TOKEN in the environment.
  token = var.linode_token
}

variable "linode_token" {
  type      = string
  sensitive = true
}

variable "root_password" {
  type      = string
  sensitive = true
}

variable "ssh_public_key" {
  type = string
}
```

## Step 2: Create a Linode Instance (IPv6 Is Automatic)

All Linode instances get a SLAAC IPv6 address automatically. The provider exposes this value with a CIDR suffix, so this example strips it before reuse:

```hcl
# linode.tf - Linode instance with automatic IPv6
resource "linode_instance" "web" {
  label      = "web-ipv6"
  image      = "linode/ubuntu22.04"
  region     = "us-east"
  type       = "g6-nanode-1"

  # Root password (use SSH keys in production)
  root_pass  = var.root_password

  # Optional: SSH key authorization
  authorized_keys = [var.ssh_public_key]

  tags = ["web", "ipv6"]
}

output "instance_ipv4" {
  value = linode_instance.web.ip_address
}

output "instance_ipv6" {
  value = split("/", linode_instance.web.ipv6)[0]
  description = "SLAAC-assigned IPv6 address of the instance"
}
```

## Step 3: Request a Dedicated IPv6 Range

Linode allows requesting a dedicated /56 or /64 IPv6 routed range for more flexible addressing:

```hcl
# ipv6-range.tf - Request a dedicated IPv6 range for the instance
resource "linode_ipv6_range" "dedicated" {
  prefix_length = 64   # Request a /64 prefix
  linode_id     = linode_instance.web.id
}

output "ipv6_range" {
  value = linode_ipv6_range.dedicated.range
  description = "Dedicated /64 IPv6 range assigned to this Linode"
}
```

## Step 4: Configure the OS to Use an Address from the Dedicated Range

After Terraform provisions the range, you can add a specific address from it inside the instance. To make routed-range addresses persistent across reboots, disable Network Helper and manage the address in your distribution's network configuration.

```hcl
# Use remote-exec to add the IPv6 address to the interface
resource "null_resource" "configure_ipv6" {
  depends_on = [linode_ipv6_range.dedicated]

  triggers = {
    instance_id = linode_instance.web.id
    ipv6_range  = linode_ipv6_range.dedicated.range
  }

  connection {
    type     = "ssh"
    host     = linode_instance.web.ip_address
    user     = "root"
    password = var.root_password
  }

  provisioner "remote-exec" {
    inline = [
      # Add the first address from the routed /64 for the current runtime
      "IPV6_RANGE=${linode_ipv6_range.dedicated.range}",
      "IPV6_ADDR=$(echo \"$IPV6_RANGE\" | sed 's|/64|1/64|')",
      "ip -6 addr add \"$IPV6_ADDR\" dev eth0",
      "ip -6 addr show dev eth0"
    ]
  }
}
```

## Step 5: Create AAAA DNS Records

```hcl
# dns.tf - Create a Linode DNS domain and AAAA record
resource "linode_domain" "main" {
  type      = "master"
  domain    = "example.com"
  soa_email = "admin@example.com"
}

resource "linode_domain_record" "web_aaaa" {
  domain_id   = linode_domain.main.id
  name        = "web"
  record_type = "AAAA"
  target      = split("/", linode_instance.web.ipv6)[0]
  ttl_sec     = 300
}
```

## Step 6: Apply and Verify

```bash
terraform init
terraform apply

# Test IPv6 connectivity to the instance
WEB_IPV6=$(terraform output -raw instance_ipv6)
ping -6 -c 3 "$WEB_IPV6"

# SSH over IPv6
ssh -6 root@"$WEB_IPV6"

# Test outbound IPv6
ssh -6 root@"$WEB_IPV6" 'curl -6 https://ipv6.icanhazip.com'
```

Linode's automatic SLAAC addressing ensures every instance is immediately reachable over IPv6, while dedicated range requests allow for predictable addressing in production environments.
