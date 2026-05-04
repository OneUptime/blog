# How to Configure SRv6 on Linux with iproute2 - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, Linux, iproute2, Segment Routing, Configuration, Networking

Description: Configure SRv6 endpoints, encapsulation, and inline mode on Linux using iproute2's seg6 and seg6local route encapsulation types.

## Introduction

Linux has supported SRv6 since kernel 4.10 (encapsulation) and 4.14 (seg6local endpoint behaviors). The `ip route` command's `encap seg6` and `encap seg6local` options provide a complete SRv6 implementation in the kernel.

## Prerequisites

```bash
# Check kernel version (requires 4.14+)

uname -r

# Enable SRv6
sudo sysctl -w net.ipv6.conf.all.seg6_enabled=1
sudo sysctl -w net.ipv6.conf.eth0.seg6_enabled=1

# Also needed for HMAC (optional security)
sudo sysctl -w net.ipv6.conf.all.seg6_require_hmac=0

# Persist settings
cat >> /etc/sysctl.d/99-srv6.conf << 'EOF'
net.ipv6.conf.all.seg6_enabled = 1
net.ipv6.conf.default.seg6_enabled = 1
EOF
```

## Step 1: Configure an SRv6 Endpoint (seg6local)

```bash
# Add SID for End behavior (plain routing endpoint)
# Packets arriving with this SID decrement SL and forward to next SID
ip -6 route add 5f00:1:1::1/128 \
  encap seg6local action End \
  dev lo

# End.X - forward to specific next-hop after processing SID
ip -6 route add 5f00:1:1:0:e001::/128 \
  encap seg6local action End.X \
  nh6 fe80::1 \
  dev eth0

# End.DT6 - decapsulate and IPv6 table lookup (L3VPN)
# Create VRF bound to table 100 first (vrftable requires a real VRF device)
ip link add CUSTOMER_A type vrf table 100
ip link set dev CUSTOMER_A up

ip -6 route add 5f00:1:1:0:e000::/128 \
  encap seg6local action End.DT6 \
  vrftable 100 \
  dev lo

# End.DX4 - decapsulate IPv6 outer header, route inner IPv4
ip -6 route add 5f00:1:1:0:e002::/128 \
  encap seg6local action End.DX4 \
  nh4 192.168.1.1 \
  dev eth1

# End.DX6 - decapsulate and IPv6 cross-connect
ip -6 route add 5f00:1:1:0:e003::/128 \
  encap seg6local action End.DX6 \
  nh6 2001:db8::1 \
  dev eth0
```

## Step 2: Configure SRv6 Encapsulation (Ingress Node)

```bash
# Encap mode: wrap original packet in a new IPv6+SRH header
# Route traffic destined for 2001:db8:dest::/48 via SRv6 path

ip -6 route add 2001:db8:dest::/48 \
  encap seg6 mode encap \
  segs 5f00:1:2:0:e001::,5f00:2:1:0:e000:: \
  dev eth0

# Inline mode: add SRH to the original IPv6 packet
# (No outer header - modifies the original packet)
ip -6 route add 2001:db8:dest::/48 \
  encap seg6 mode inline \
  segs 5f00:1:2::,5f00:2:1:: \
  dev eth0

# L2 encap mode (for Ethernet over SRv6)
ip -6 route add 2001:db8:dest::/48 \
  encap seg6 mode l2encap \
  segs 5f00:1:2::,5f00:2:1:: \
  dev eth0
```

## Step 3: Verify SRv6 Configuration

```bash
# Show all seg6local routes
ip -6 route show encap seg6local

# Show all seg6 encap routes
ip -6 route show encap seg6

# Resolve a destination to see which encap will be applied
ip -6 route get 2001:db8:dest::1

# Test SRv6 encapsulation with a packet
# (Requires the destination to have seg6local End.DT6 configured)
ping6 -c 5 2001:db8:dest::1

# Use traceroute to verify path
traceroute6 2001:db8:dest::1
```

## Step 4: HMAC Authentication (Optional)

```bash
# Enable HMAC for SRv6 packet authentication
# (Kernel must be compiled with CONFIG_IPV6_SEG6_HMAC=y)

# Add HMAC key (passphrase is read from stdin, not from the command line)
# Supported algorithms: sha1, sha256
ip sr hmac set 1 sha256
# (enter the secret passphrase at the prompt, terminated by newline;
#  an empty passphrase removes the mapping)

# Verify key
ip sr hmac show

# Require HMAC on incoming SRv6 packets
sudo sysctl -w net.ipv6.conf.eth0.seg6_require_hmac=1
```

## Complete Example: Service Chain on a Single Linux Host

```bash
#!/bin/bash
# srv6-demo.sh - demonstrate SRv6 service chaining on Linux

# Enable SRv6
sysctl -w net.ipv6.conf.all.seg6_enabled=1

# Configure locator addresses on loopback
ip -6 addr add 5f00:1:1::1/128 dev lo
ip -6 addr add 5f00:1:1:0:e001::/128 dev lo

# Endpoint: End (plain forwarding)
ip -6 route add 5f00:1:1::1/128 encap seg6local action End dev lo

# Endpoint: End.DT6 (L3VPN) - requires a VRF bound to the chosen table id
ip link add CUSTOMER_A type vrf table 254
ip link set dev CUSTOMER_A up
ip -6 route add 5f00:1:1:0:e000::/128 \
  encap seg6local action End.DT6 vrftable 254 dev lo

# Ingress: Route 2001:db8::/48 via SRv6 through 5f00:1:1::1
ip -6 route add 2001:db8::/48 \
  encap seg6 mode encap segs 5f00:1:1::1 dev lo

echo "SRv6 configured. Test with: ping6 2001:db8::1"
```

## Conclusion

Linux's iproute2 provides a full SRv6 implementation through `encap seg6` (source routing) and `encap seg6local` (endpoint functions). These can be used for software routers, testing, and network function virtualization. Monitor your SRv6 paths end-to-end with OneUptime synthetic probes.
