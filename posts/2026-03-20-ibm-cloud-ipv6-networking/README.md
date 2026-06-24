# How to Configure IBM Cloud IPv6 Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IBM Cloud, IPv6, VPC, Classic Infrastructure, Dual-Stack

Description: Configure IPv6 on IBM Cloud VPC and classic infrastructure for dual-stack server deployments.

## Introduction

IBM Cloud IPv6 networking is available on classic infrastructure. IBM Cloud VPC is currently IPv4-only, so dual-stack deployments that need native IPv6 must use classic infrastructure resources and IBM Cloud DNS and security controls.

## Step 1: Enable IPv6 on the Instance/Resource

```bash
# IBM Cloud VPC does not currently support IPv6.
# For classic infrastructure, request a primary public IPv6 address when you provision
# the server, or order a public IPv6 /64 secondary subnet on the server's public VLAN.

# List existing IPv6 subnets on your account
ibmcloud sl subnet list --6

# Order a public IPv6 /64 on a public VLAN
ibmcloud sl subnet create public 64 <PUBLIC_VLAN_ID> --6
```

## Step 2: Configure the Network Interface

```bash
# On a classic server, verify that the IPv6 address and route are present
ip -6 addr show dev eth0
ip -6 route show

# If you purchased a secondary IPv6 subnet, configure one of its addresses
# as an interface alias by using your Linux distribution's network config.
```

## Step 3: Configure Firewall Rules for IPv6

```bash
# If you use a host firewall inside the guest, allow ICMPv6 and SSH over IPv6.
# Classic infrastructure security groups also support IPv6 rules.

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
# Add an AAAA record in IBM Cloud DNS Services
ibmcloud dns resource-record-create <DNS_ZONE_ID> --type AAAA --name myhost --ipv6 2001:db8::10

# Verify resolution
dig AAAA myhost.example.com
# Should return the IPv6 address

# Reverse DNS for classic public IPs is managed from the subnet/IP details page
dig -x 2001:db8::10
```

## Step 5: Test IPv6 Connectivity

```bash
# Test outbound IPv6
curl -6 https://ipv6.google.com/
ping -6 -c 3 2001:4860:4860::8888

# Test inbound IPv6
curl -6 http://[2001:db8::10]/health

# Verify dual-stack (both IPv4 and IPv6 work)
curl -4 http://myhost.example.com/health
curl -6 http://myhost.example.com/health
```

## Step 6: Infrastructure as Code

```terraform
# IBM Cloud VPC resources are IPv4-only.
# For classic infrastructure, Terraform can order a public IPv6 /64 subnet.
resource "ibm_subnet" "classic_ipv6_subnet" {
  type       = "Portable"
  private    = false
  ip_version = 6
  capacity   = 64
  vlan_id    = 1234567
  notes      = "classic-ipv6-subnet"
}
```

## Common Issues

```bash
# Issue: Trying to enable IPv6 on a VPC instance
# IBM Cloud VPC is currently IPv4-only

# Issue: IPv6 address not assigned on classic infrastructure
ip -6 addr show dev eth0
ibmcloud sl subnet list --6

# Issue: No IPv6 connectivity on classic infrastructure
ip -6 route show

# Issue: Can't reach the server over IPv6
# Check guest firewall or classic security group rules
ip6tables -L INPUT -n -v
```

## Conclusion

IBM Cloud IPv6 networking on classic infrastructure requires requesting public IPv6 or ordering an IPv6 /64, configuring OS and firewall settings, setting up DNS, and verifying end-to-end connectivity. IBM Cloud VPC remains IPv4-only at the time of writing, so native dual-stack deployments require classic infrastructure rather than VPC. Use Infrastructure as Code (Terraform) to keep classic IPv6 configuration consistent across instances. Monitor IPv6 endpoint availability with OneUptime from IPv6 vantage points.
