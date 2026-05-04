# How to Configure Hetzner Cloud Servers with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Hetzner, Cloud, VPS, Networking

Description: Configure IPv6 on Hetzner Cloud servers, including the default /64 assignment, subnet routing, and firewall rules for both dedicated and cloud instances.

## Introduction

Hetzner Cloud assigns a /64 IPv6 subnet to each server by default. Unlike single-address providers, Hetzner gives you a full /64, allowing you to assign multiple IPv6 addresses to a server or configure IPv6 for multiple VMs behind a single server.

## IPv6 on Hetzner Cloud Servers

```bash
# Hetzner Cloud assigns a /64 subnet

# Example: 2a01:4f8:abc:1234::/64
# Default address: 2a01:4f8:abc:1234::1/64

# Verify via hcloud CLI
hcloud server describe my-server | grep -A5 "IPv6"

# Or via API
curl -H "Authorization: Bearer $HCLOUD_TOKEN" \
  https://api.hetzner.cloud/v1/servers/12345 | \
  jq '.server.public_net.ipv6'
```

## Terraform for Hetzner with IPv6

```hcl
# main.tf
resource "hcloud_server" "web" {
  name        = "web-server"
  image       = "ubuntu-22.04"
  server_type = "cx22"
  location    = "nbg1"

  # IPv6 is assigned by default
  # primary_ipv6 is automatically created
}

# Floating IPv6 (static external IPv6)
resource "hcloud_floating_ip" "ipv6" {
  type          = "ipv6"
  home_location = "nbg1"
}

resource "hcloud_floating_ip_assignment" "main" {
  floating_ip_id = hcloud_floating_ip.ipv6.id
  server_id      = hcloud_server.web.id
}

output "server_ipv6" {
  value = hcloud_server.web.ipv6_address
}
output "floating_ipv6" {
  value = hcloud_floating_ip.ipv6.ip_address
}
```

## OS Configuration for the /64 Subnet

```bash
# The /64 subnet allows assigning multiple IPv6 addresses
# Default: 2a01:4f8:abc:1234::1/64

# Add additional addresses from the /64
ip -6 addr add 2a01:4f8:abc:1234::2/64 dev eth0
ip -6 addr add 2a01:4f8:abc:1234::beef/64 dev eth0
ip -6 addr add 2a01:4f8:abc:1234::cafe/64 dev eth0

# Persistent via Netplan (Ubuntu)
cat > /etc/netplan/60-ipv6-additional.yaml << 'EOF'
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - "2a01:4f8:abc:1234::1/64"
        - "2a01:4f8:abc:1234::beef/64"
        - "2a01:4f8:abc:1234::cafe/64"
EOF
netplan apply
```

## Hetzner Cloud Firewall for IPv6

```bash
# Create firewall with IPv6 rules
hcloud firewall create --name my-firewall

# Add inbound HTTP/HTTPS rules for IPv6
hcloud firewall add-rule my-firewall \
  --direction in \
  --protocol tcp \
  --port 80 \
  --source-ips "::/0"

hcloud firewall add-rule my-firewall \
  --direction in \
  --protocol tcp \
  --port 443 \
  --source-ips "::/0"

hcloud firewall add-rule my-firewall \
  --direction in \
  --protocol tcp \
  --port 22 \
  --source-ips "your-office-ipv6/128"

# Apply to server
hcloud firewall apply-to-resource my-firewall \
  --type server \
  --server my-server
```

## Multiple Services on Different IPv6 Addresses

```nginx
# Each service on a distinct IPv6 address from the /64
server {
    listen [2a01:4f8:abc:1234::beef]:80;
    server_name www.example.com;
    # Web server
}

server {
    listen [2a01:4f8:abc:1234::cafe]:80;
    server_name mail.example.com;
    # Webmail
}
```

## Conclusion

Hetzner Cloud's default /64 IPv6 subnet allocation allows flexible multi-address configurations. Use the full /64 to assign distinct IPv6 addresses to different services or VMs. Configure Hetzner Cloud Firewalls with `::/0` source for public IPv6 access control. Monitor each IPv6 address independently with OneUptime for per-service health tracking.
