# How to Configure Oracle Cloud Infrastructure IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OCI, Oracle Cloud, IPv6, VCN, Dual-Stack, Networking

Description: Configure IPv6 on Oracle Cloud Infrastructure (OCI) VCN subnets, compute instances, and load balancers.

## Introduction

Oracle Cloud Infrastructure IPv6 covers the provider-specific steps needed to enable IPv6 on compute resources, configure networking primitives, and validate end-to-end IPv6 connectivity.

## Step 1: Enable IPv6 on the Instance/Resource

```bash
# Example commands for Oracle Cloud Infrastructure IPv6

# Enable IPv6 networking at creation time or after
# (Refer to provider-specific CLI or web console)
echo "Enabling IPv6 for Oracle Cloud Infrastructure IPv6"
```

## Step 2: Configure the Network Interface

```bash
# After enabling IPv6, configure the OS network interface
# (Linux example)
ip -6 addr show

# If using static IPv6 assignment
ip -6 addr add 2001:db8::1/64 dev eth0
ip -6 route add ::/0 via 2001:db8::1 dev eth0
```

## Step 3: Configure Firewall Rules for IPv6

```bash
# Allow ICMPv6 (required for IPv6 operation)
ip6tables -A INPUT -p ipv6-icmp -j ACCEPT
ip6tables -A OUTPUT -p ipv6-icmp -j ACCEPT

# Allow established connections
ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH over IPv6
ip6tables -A INPUT -s 2001:db8:admin::/48 -p tcp --dport 22 -j ACCEPT

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

# Test reverse DNS
dig -x 2001:db8::1
```

## Step 5: Test IPv6 Connectivity

```bash
# Test outbound IPv6
curl -6 https://ipv6.google.com/
ping6 -c 3 2600::

# Test inbound IPv6
curl -6 http://[2001:db8::1]/health

# Verify dual-stack (both IPv4 and IPv6 work)
curl -4 http://myhost.example.com/health
curl -6 http://myhost.example.com/health
```

## Step 6: Infrastructure as Code

```hcl
# Terraform example for Oracle Cloud Infrastructure IPv6
# VCN with IPv6 enabled
resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_id
  display_name   = "ipv6-vcn"
  cidr_blocks    = ["10.0.0.0/16"]
  is_ipv6enabled = true

  freeform_tags = {
    Environment = "production"
    IPv6        = "enabled"
  }
}

# Subnet with IPv6 CIDR
resource "oci_core_subnet" "main" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "ipv6-subnet"
  cidr_block     = "10.0.1.0/24"
  ipv6cidr_block = cidrsubnet(oci_core_vcn.main.ipv6cidr_blocks[0], 8, 0)
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

Oracle Cloud Infrastructure IPv6 requires enabling IPv6 at the provider level, configuring OS network settings, setting up firewall rules that permit ICMPv6, and verifying end-to-end connectivity. Use Infrastructure as Code (Terraform) to ensure consistent IPv6 configuration across all instances. Monitor IPv6 endpoint availability with OneUptime from IPv6 vantage points.
