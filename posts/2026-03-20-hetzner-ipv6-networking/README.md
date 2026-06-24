# How to Configure Hetzner Cloud IPv6 Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Hetzner, IPv6, Cloud, Dual-Stack, VPS, Networking

Description: Configure IPv6 on Hetzner Cloud servers and private networks for dual-stack application deployments.

## Introduction

Hetzner Cloud IPv6 Networking covers the provider-specific steps needed to enable public IPv6 on compute resources, pair it with Hetzner's IPv4-only private Networks when needed, and validate end-to-end IPv6 connectivity.

## Step 1: Enable IPv6 on the Instance/Resource

```bash
# New servers receive IPv6 by default unless you create them with --without-ipv6
hcloud server create --name ipv6-instance --type cx23 --image ubuntu-24.04

# If you assign a Primary IPv6 after server creation, power off the server first.
# Then update the OS network configuration before relying on the new address.
```

## Step 2: Configure the Network Interface

```bash
# Inspect the current IPv6 configuration
ip -6 addr show dev eth0
ip -6 route show

# Temporary example for a manually added Primary IPv6.
# For a persistent configuration, update your distro's network config as documented by Hetzner.
ip -6 addr add 2001:db8:0:3df1::1/64 dev eth0
ip -6 route replace default via fe80::1 dev eth0
```

## Step 3: Configure Firewall Rules for IPv6

```bash
# Allow loopback
ip6tables -A INPUT -i lo -j ACCEPT

# Allow established connections
ip6tables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow ICMPv6 (required for IPv6 operation)
ip6tables -A INPUT -p ipv6-icmp -j ACCEPT
ip6tables -A OUTPUT -p ipv6-icmp -j ACCEPT

# Allow SSH over IPv6 from an admin prefix
ip6tables -A INPUT -s 2001:db8:100::/48 -p tcp --dport 22 -j ACCEPT

# Default deny
ip6tables -P INPUT DROP
```

## Step 4: DNS Configuration for IPv6

```bash
# Add an AAAA record for the instance hostname in your authoritative DNS provider

# On Hetzner, set reverse DNS (PTR) for the server IP
hcloud server set-rdns --ip 2001:db8:0:3df1::1 --hostname myhost.example.com my-server

# Verify resolution
dig AAAA myhost.example.com
# Should return the IPv6 address

# Test reverse DNS
dig -x 2001:db8:0:3df1::1
```

## Step 5: Test IPv6 Connectivity

```bash
# Test outbound IPv6
curl -6 https://ipv6.google.com/
ping -6 -c 3 ipv6.google.com

# From another IPv6-capable host, test inbound IPv6
curl -6 http://[2001:db8:0:3df1::1]/health

# Verify dual-stack (both IPv4 and IPv6 work)
curl -4 http://myhost.example.com/health
curl -6 http://myhost.example.com/health
```

## Step 6: Infrastructure as Code

```terraform
# Terraform example for Hetzner Cloud IPv6 Networking
# Resource with dual-stack public networking enabled
resource "hcloud_server" "main" {
  name        = "ipv6-instance"
  image       = "ubuntu-24.04"
  server_type = "cx23"

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }

  labels = {
    environment = "production"
    stack       = "dual-stack"
  }
}
```

## Common Issues

```bash
# Issue: IPv6 address not assigned
# Check if provider assigned the address
ip -6 addr show

# Issue: No IPv6 connectivity
# Check routing
ip -6 route show
# Verify default route: default via fe80::1 dev eth0

# Issue: Can't ping IPv6 address
# Check if firewall is blocking
ip6tables -L INPUT -n -v
```

## Conclusion

Hetzner Cloud IPv6 Networking requires enabling a Primary IPv6 at the provider level, configuring OS network settings, setting up firewall rules that permit ICMPv6, and verifying end-to-end connectivity. Hetzner private Networks are IPv4-only, so dual-stack deployments typically combine public IPv6 with private IPv4. Use Infrastructure as Code (Terraform) to ensure consistent IPv6 configuration across all instances. Monitor IPv6 endpoint availability with OneUptime from IPv6 vantage points.
