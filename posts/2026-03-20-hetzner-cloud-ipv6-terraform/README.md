# How to Configure Hetzner Cloud IPv6 with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Hetzner Cloud, Terraform, IPv6, Server, Networking, Cloud

Description: A guide to provisioning Hetzner Cloud servers and networks with IPv6 addressing using Terraform, including floating IP and DNS configuration.

With the hcloud Terraform provider's default server configuration, Hetzner Cloud automatically creates and assigns an IPv6 Primary IP. That gives the server a free /64 IPv6 network and the first IPv6 address from that network. Hetzner also supports IPv6 Floating IPs and private networks. This guide covers common IPv6 configurations with Terraform.

## Step 1: Configure the Hetzner Cloud Provider

```hcl
# provider.tf

terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.62"
    }
  }
}

provider "hcloud" {
  # Set HCLOUD_TOKEN env var or use token attribute
  token = var.hcloud_token
}

variable "hcloud_token" {
  type      = string
  sensitive = true
}
```

## Step 2: Create a Server (IPv6 Is Automatic)

If you omit the `public_net` block, the hcloud provider automatically creates and assigns IPv4 and IPv6 Primary IPs. No explicit IPv6 flag is needed:

```hcl
# server.tf - Hetzner Cloud server with automatic IPv6
resource "hcloud_server" "web" {
  name        = "web-01"
  image       = "ubuntu-22.04"
  server_type = "cx23"
  location    = "nbg1"

  # Replace with an existing Hetzner SSH key name or ID
  ssh_keys = ["main"]

  # Optional: user_data to configure additional IPv6 settings
  user_data = <<-EOF
    #cloud-config
    package_update: true
    packages:
      - curl
      - iputils-ping
  EOF

  labels = {
    role = "web"
    ipv6 = "enabled"
  }
}

output "server_ipv4" {
  value = hcloud_server.web.ipv4_address
}

output "server_ipv6" {
  value = hcloud_server.web.ipv6_address
  description = "The first IPv6 address in the assigned /64 network"
}

output "server_ipv6_network" {
  value = hcloud_server.web.ipv6_network
  description = "The full /64 prefix assigned to this server"
}
```

## Step 3: Create an IPv6 Floating IP

Floating IPs in Hetzner can be IPv4 or IPv6. IPv6 Floating IPs are /64 prefixes that can be reassigned between servers:

```hcl
# floating-ip.tf - Create an IPv6 Floating IP
resource "hcloud_floating_ip" "web_ipv6" {
  type          = "ipv6"
  home_location = "nbg1"
  description   = "Primary IPv6 floating IP for web tier"

  labels = {
    environment = "production"
  }
}

# Assign the floating IP to the server
resource "hcloud_floating_ip_assignment" "web" {
  floating_ip_id = hcloud_floating_ip.web_ipv6.id
  server_id      = hcloud_server.web.id
}

output "floating_ipv6" {
  value = hcloud_floating_ip.web_ipv6.ip_address
}
```

## Step 4: Configure the OS to Use the Floating IPv6

After assigning the floating IP, configure the OS to bind it. Add this to user_data or run via remote-exec:

```bash
# On the server: configure the floating IPv6 on the interface
# Hetzner floating IPs must be configured in the OS manually

# Add the floating IPv6 address to eth0 (replace with your address)
ip -6 addr add 2a01:4f8:1:2::1/128 dev eth0

# Make it persistent (Netplan example for Ubuntu)
cat > /etc/netplan/60-floating-ipv6.yaml <<'NETPLAN'
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      addresses:
        - 2a01:4f8:1:2::1/64
NETPLAN
netplan apply
```

## Step 5: Add RDNS (Reverse DNS) for IPv6

```hcl
# rdns.tf - Set reverse DNS for the Floating IPv6 address
resource "hcloud_rdns" "web_ipv6" {
  floating_ip_id = hcloud_floating_ip.web_ipv6.id
  ip_address     = hcloud_floating_ip.web_ipv6.ip_address
  dns_ptr        = "web-01.example.com"
}
```

## Step 6: Apply and Test

```bash
terraform apply

# Test SSH over IPv6
SERVER_IPV6=$(terraform output -raw server_ipv6)
FLOATING_IPV6=$(terraform output -raw floating_ipv6)
ssh root@"$SERVER_IPV6"

# Test outbound IPv6 from the server
ssh root@"$SERVER_IPV6" 'ping -6 -c 3 ipv6.google.com'

# Test RDNS on the Floating IPv6
dig -x "$FLOATING_IPV6"
```

Hetzner Cloud's automatic IPv6 assignment and competitive pricing make it an excellent platform for running IPv6-native or dual-stack workloads at low cost.
