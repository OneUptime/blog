# How to Troubleshoot IPv6 Tunnel Connectivity Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Tunneling, Troubleshooting, Network Diagnostics, Connectivity

Description: A step-by-step guide to diagnosing and resolving IPv6 tunnel connectivity failures using standard Linux network tools.

## Common Causes of Tunnel Connectivity Failures

IPv6 tunnel issues typically fall into a few categories:

1. **Tunnel interface not up** - misconfigured or missing interface setup
2. **MTU mismatch** - oversized packets silently dropped
3. **Firewall blocking** - outer IPv4 protocol (41, GRE, etc.) blocked by firewall
4. **Routing problems** - missing or incorrect routes inside/outside the tunnel
5. **ICMPv6 blocked** - neighbor discovery or PMTUD messages filtered

## Step 1: Verify the Tunnel Interface is Up

```bash
# Check all interfaces including tunnel interfaces

ip link show

# Check a specific tunnel interface
ip link show sit1

# Look for "UP" in the output flags, e.g.:
# sit1: <NOARP,UP,LOWER_UP> mtu 1480 ...
# If the interface is DOWN, bring it up
ip link set dev sit1 up
```

## Step 2: Verify IPv6 Addresses on the Tunnel

```bash
# List IPv6 addresses on the tunnel interface
ip -6 addr show dev sit1

# If no address is shown, assign one
ip -6 addr add 2001:db8:1::1/64 dev sit1
```

## Step 3: Check IPv6 Routes Through the Tunnel

```bash
# Show IPv6 routing table
ip -6 route show

# Verify a route exists via the tunnel
# Expected output: default via 2001:db8:1::2 dev sit1
ip -6 route get 2001:4860:4860::8888
```

## Step 4: Ping the Remote Tunnel Endpoint

```bash
# Ping the remote IPv6 address of the tunnel peer
ping6 -c 5 2001:db8:1::2

# If this fails but the tunnel is up, check firewall rules
# on both sides for protocol 41 (6in4) or protocol 47 (GRE)
```

## Step 5: Check the Outer IPv4 Transport

The outer IPv4 connection must be working for the IPv6 tunnel to function:

```bash
# Ping the outer IPv4 address of the remote tunnel endpoint
ping -c 5 203.0.113.1

# Use traceroute to identify where the outer path breaks
traceroute 203.0.113.1
```

## Step 6: Verify Firewall Rules Allow Tunnel Protocol

For 6in4 (SIT) tunnels, the outer protocol is IP protocol 41. For GRE it is protocol 47:

```bash
# Check iptables rules that might block protocol 41 (6in4)
iptables -L -n | grep -E '41|proto 41'

# Allow protocol 41 if blocked
iptables -I INPUT -p 41 -j ACCEPT
iptables -I OUTPUT -p 41 -j ACCEPT

# For GRE tunnels (protocol 47)
iptables -I INPUT -p 47 -j ACCEPT
iptables -I OUTPUT -p 47 -j ACCEPT
```

## Step 7: Check for MTU-Related Drops

Silent packet drops due to MTU mismatches are a common tunnel issue:

```bash
# Test with progressively smaller packet sizes to find effective MTU
# Start at 1432 (1480 - 48 for IPv6+ICMPv6 headers) to fill the SIT MTU and go down
ping6 -M do -s 1432 2001:db8:1::2  # 1432 + 48 = 1480 (sit MTU)
ping6 -M do -s 1200 2001:db8:1::2  # smaller test

# Check if ICMPv6 "Packet Too Big" messages are generated
# Use tcpdump to capture ICMPv6 traffic
tcpdump -i any -n 'icmp6 and ip6[40] == 2'
```

## Step 8: Inspect Kernel Tunnel Statistics for Errors

```bash
# View detailed statistics including errors and drops
ip -s -s link show sit1

# Check /proc for tunnel-related errors
cat /proc/net/dev | grep sit
```

## Step 9: Use tracepath6 for End-to-End MTU Discovery

```bash
# tracepath6 shows per-hop MTU and latency to diagnose where issues occur
tracepath6 2001:db8:1::2

# For a destination beyond the tunnel
tracepath6 2001:4860:4860::8888
```

## Diagnostic Checklist

- Tunnel interface is UP and has an IPv6 address assigned
- Outer IPv4 connectivity between tunnel endpoints works
- Firewall allows IP protocol 41 (6in4) or 47 (GRE) in both directions
- ICMPv6 (all types) is allowed through firewalls
- MTU is set correctly on the tunnel interface (typically 1480 for SIT)
- IPv6 routing table has correct routes via the tunnel interface

## Summary

IPv6 tunnel troubleshooting follows a systematic top-down approach: verify the interface, check addresses and routes, test the outer transport, inspect firewall rules, and diagnose MTU issues. Most failures stem from firewall blocks on encapsulation protocols or undetected MTU mismatches.
