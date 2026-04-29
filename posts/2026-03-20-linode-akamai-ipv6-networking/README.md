# How to Configure Linode Akamai IPv6 Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linode, Akamai, IPv6, Cloud, Dual-Stack, Networking

Description: Configure IPv6 on Linode (now Akamai Cloud) Compute instances and NodeBalancers for dual-stack deployments.

## Introduction

Linode Akamai IPv6 Networking covers the provider-specific steps needed to use the IPv6 addresses assigned to compute resources, configure networking primitives, and validate end-to-end IPv6 connectivity.

## Step 1: Verify IPv6 on the Instance/Resource

```bash
# On Linode Compute instances, the primary IPv6 address is assigned automatically via SLAAC.
# NodeBalancers are provisioned with public IPv4 and IPv6 addresses automatically.
ip -6 addr show dev eth0
```

## Step 2: Configure the Network Interface

```bash
# On Linode, the primary IPv6 address should normally remain SLAAC-configured.
ip -6 addr show dev eth0
ip -6 route show

# If you have been assigned an IPv6 routed range (/64 or /56),
# disable Network Helper and add an address from that range manually.
ip -6 addr add 2001:db8:e001:1b8c::10/64 dev eth0

# When manually defining an IPv6 default route, use Linode's link-local gateway.
ip -6 route replace default via fe80::1 dev eth0
```

## Step 3: Configure Firewall Rules for IPv6

```bash
# Allow loopback traffic
ip6tables -A INPUT -i lo -j ACCEPT

# Allow ICMPv6 (required for IPv6 operation)
ip6tables -A INPUT -p ipv6-icmp -j ACCEPT
ip6tables -A OUTPUT -p ipv6-icmp -j ACCEPT

# Allow established connections
ip6tables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow SSH over IPv6
ip6tables -A INPUT -s 2001:db8:100::/48 -p tcp --dport 22 -j ACCEPT

# Default deny
ip6tables -P INPUT DROP
```

## Step 4: DNS Configuration for IPv6

```bash
# Add AAAA record for the instance or NodeBalancer hostname
# (In the provider's DNS management console or API)

# Verify resolution
dig AAAA myhost.example.com
# Should return the IPv6 address

# Test reverse DNS
dig -x 2001:db8::1
```

## Step 5: Test IPv6 Connectivity

```bash
# Test outbound IPv6
curl -6 https://example.com/
ping -6 -c 3 google.com

# Test inbound IPv6
curl -6 http://[2001:db8:e001:1b8c::10]/health

# Verify dual-stack (both IPv4 and IPv6 work)
curl -4 http://myhost.example.com/health
curl -6 http://myhost.example.com/health
```

## Step 6: Infrastructure as Code

```terraform
# Terraform example for Linode Akamai IPv6 Networking
# Linode instances receive a primary IPv6 SLAAC address automatically.
resource "linode_instance" "main" {
  label      = "ipv6-instance"
  region     = "us-east"
  type       = "g6-standard-1"
  image      = "linode/debian12"
  root_pass  = "ReplaceWithAStrongPassw0rd!123"
  private_ip = true

  tags = ["production", "ipv6"]
}

# NodeBalancers are provisioned with public IPv4 and IPv6 addresses automatically.
resource "linode_nodebalancer" "main" {
  label  = "ipv6-nodebalancer"
  region = "us-east"
}
```

## Common Issues

```bash
# Issue: Primary IPv6 address not assigned
# Verify the interface is accepting router advertisements for SLAAC
ip -6 addr show dev eth0

# Issue: No IPv6 connectivity
# Check routing
ip -6 route show
# Verify default route: default via fe80::1 dev eth0

# Issue: Can't ping IPv6 address
# Check if firewall is blocking
ip6tables -L INPUT -n -v
```

## Conclusion

Linode Akamai IPv6 Networking relies on the provider-assigned IPv6 SLAAC address, optional manually configured IPv6 routed ranges, firewall rules that permit ICMPv6, and end-to-end connectivity checks. Use Infrastructure as Code (Terraform) to ensure consistent IPv6 configuration across instances and NodeBalancers. Monitor IPv6 endpoint availability with OneUptime from IPv6 vantage points.
