# How to Configure DigitalOcean IPv6 Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DigitalOcean, IPv6, Droplet, Dual-Stack, Cloud, Networking

Description: Configure IPv6 on DigitalOcean Droplets and Kubernetes clusters, including static IPv6 assignment and firewall rules.

## Introduction

DigitalOcean IPv6 Networking covers the provider-specific steps needed to enable IPv6 on compute resources, configure networking primitives, and validate end-to-end IPv6 connectivity.

## Step 1: Enable IPv6 on the Instance/Resource

```bash
# Enable IPv6 when creating a Droplet
doctl compute droplet create ipv6-instance \
  --size s-1vcpu-1gb \
  --image ubuntu-22-04-x64 \
  --region nyc3 \
  --enable-ipv6

# Enable IPv6 on an existing Droplet after powering it off
doctl compute droplet-action enable-ipv6 <droplet-id>
```

## Step 2: Configure the Network Interface

```bash
# After enabling IPv6 on an existing Droplet, configure the primary
# IPv6 address and gateway shown on the Droplet's Networking tab in
# your OS network configuration, then verify the result.
ip -6 addr show dev eth0
ip -6 route show

# To add an additional IPv6 from the Droplet's assigned /124 range:
ip -6 addr add 2001:db8::2/64 dev eth0
```

## Step 3: Configure Firewall Rules for IPv6

```bash
# Allow ICMPv6 (required for IPv6 operation)
ip6tables -A INPUT -p icmpv6 -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 -j ACCEPT

# Allow established connections
ip6tables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow SSH over IPv6
ip6tables -A INPUT -s 2001:db8:100::/48 -p tcp --dport 22 -j ACCEPT

# Allow HTTP health checks over IPv6
ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT

# Default deny
ip6tables -P INPUT DROP
```

## Step 4: DNS Configuration for IPv6

```bash
# Add AAAA record for the instance hostname
# (In the provider's DNS management console or API)

# Verify resolution
dig AAAA myhost.example.com
# Should return the IPv6 address

# Test reverse DNS for the primary IPv6 address if PTR is configured
dig -x 2001:db8::1
```

## Step 5: Test IPv6 Connectivity

```bash
# Test outbound IPv6 from the Droplet
ping6 -c 3 2001:4860:4860::8888

# Test inbound IPv6 from another IPv6-capable host
curl -6 http://[2001:db8::1]/health

# Verify dual-stack from another host with both IPv4 and IPv6 connectivity
curl -4 http://myhost.example.com/health
curl -6 http://myhost.example.com/health
```

## Step 6: Infrastructure as Code

```terraform
# Terraform example for DigitalOcean IPv6 Networking
# Resource with IPv6 enabled
resource "digitalocean_droplet" "main" {
  name   = "ipv6-instance"
  region = "nyc3"
  size   = "s-1vcpu-1gb"
  image  = "ubuntu-22-04-x64"
  ipv6   = true

  tags = ["production", "ipv6"]
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
# Verify the default route points to the IPv6 gateway assigned on the Droplet's Networking tab

# Issue: Can't ping IPv6 address
# Check if the firewall is blocking ICMPv6
ip6tables -L INPUT -n -v
```

## Conclusion

DigitalOcean IPv6 Networking requires enabling IPv6 at the provider level, configuring OS network settings, setting up firewall rules that permit ICMPv6, and verifying end-to-end connectivity. Use Infrastructure as Code (Terraform) to ensure consistent IPv6 configuration across all instances. Monitor IPv6 endpoint availability with OneUptime from IPv6 vantage points.
