# How to Verify Router Advertisement Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Router Advertisement, Verification, Radvd, Networking, Troubleshooting

Description: Verify IPv6 Router Advertisement configuration end-to-end from the router's radvd settings through to client address assignment and default route installation.

## Introduction

After configuring Router Advertisements, a systematic verification process ensures that every layer is working correctly: radvd is running and sending RAs, clients are receiving them, addresses are being configured, and default routes are installed. This guide provides a complete verification checklist.

## Step 1: Verify radvd Configuration Syntax

```bash
# Test radvd configuration file for syntax errors before reloading

sudo radvd --configtest -C /etc/radvd.conf
# Output: "configuration file is ok" or a specific error message

# View the current running configuration
cat /etc/radvd.conf
```

## Step 2: Verify radvd Is Running and Sending RAs

```bash
# Check radvd daemon status
sudo systemctl status radvd

# Verify radvd is actively sending RAs by checking the log
sudo journalctl -u radvd -n 20

# Confirm RA packets are being transmitted on the interface
sudo tcpdump -i eth1 -v "icmp6 and ip6[40] == 134" -c 3
# Type 134 = Router Advertisement
# You should see output like:
# IP6 fe80::1 > ff02::1: ICMP6, router advertisement, length 64
```

## Step 3: Verify RA Content with rdisc6

```bash
# Send a Router Solicitation and display the complete RA response
rdisc6 eth0

# The output should include:
# - Router lifetime > 0 (non-zero means it's a default gateway)
# - Correct prefix with valid lifetimes
# - Stateful address conf: No (for SLAAC mode)
# - DNS server addresses (if RDNSS is configured)
# - DNS search list (if DNSSL is configured)
```

## Step 4: Verify Client Address Assignment

```bash
# On a client connected to the RA-enabled segment
# Check that a global IPv6 address was assigned via SLAAC
ip -6 addr show scope global

# Verify the address belongs to the advertised prefix
# e.g., if RA advertises 2001:db8:1:1::/64,
# the client should have an address starting with 2001:db8:1:1:

# Check address flags:
# - "dynamic" = assigned via SLAAC or DHCPv6 (not static)
# - "mngtmpaddr" = the stable address used for generating temp addresses
# - "temporary" = RFC 4941 temporary address (if privacy extensions enabled)
```

## Step 5: Verify Default Route

```bash
# Verify the default route was installed from RA
ip -6 route show default

# Expected output:
# default via fe80::<router-link-local> dev eth0 proto ra metric 1024 pref medium

# Check the route protocol is "ra" (from Router Advertisement)
# If "static" appears, the route was manually added, not from RA
```

## Step 6: Verify DNS Configuration

```bash
# Check if DNS was configured via RDNSS
# systemd-resolved shows per-interface DNS:
systemd-resolve --status | grep -A 5 "Link [0-9]"

# Or check resolv.conf for systems using it directly
cat /etc/resolv.conf

# Test DNS resolution works
dig AAAA example.com
nslookup example.com
```

## Step 7: Verify End-to-End Connectivity

```bash
# Test connectivity from client to an external IPv6 address
ping6 -c 3 2606:4700:4700::1111

# Test DNS-based connectivity
curl -6 https://ifconfig.me

# Verify the source address used is the correct SLAAC address
# (not the link-local address)
```

## Step 8: Check the Neighbor Discovery Cache

```bash
# On the router, verify clients appear in the neighbor cache
ip -6 neigh show dev eth1

# Expected output shows clients with their IPv6 addresses and MAC addresses:
# 2001:db8:1:1:a1b2:c3d4:e5f6:7890 dev eth1 lladdr 00:11:22:33:44:55 STALE
```

## Automated Verification Script

```bash
#!/bin/bash
# verify_ipv6_ra.sh - Quick RA verification checklist

IFACE="${1:-eth0}"
echo "=== IPv6 RA Verification for $IFACE ==="

echo -n "[1] radvd running: "
systemctl is-active radvd 2>/dev/null || echo "NOT RUNNING"

echo -n "[2] RA packets being sent: "
timeout 5 tcpdump -i "$IFACE" -q "icmp6 and ip6[40] == 134" 2>/dev/null | \
    grep -c "router advertisement" && echo "packets/5s" || echo "NONE DETECTED"

echo -n "[3] Global IPv6 address: "
ip -6 addr show "$IFACE" scope global | grep -c inet6 && echo "addresses" || echo "NONE"

echo -n "[4] Default route via RA: "
ip -6 route show default | grep "proto ra" | wc -l | \
    xargs -I{} sh -c '[ {} -gt 0 ] && echo "OK" || echo "MISSING"'

echo -n "[5] DNS configured: "
systemd-resolve --status 2>/dev/null | grep -c "DNS Servers" || echo "CHECK MANUALLY"
```

## Conclusion

Systematic verification of Router Advertisement configuration covers: radvd health and RA transmission, prefix correctness and flag values, client address assignment, default route installation, DNS delivery, and end-to-end connectivity. Running through this checklist after any RA configuration change ensures that the entire SLAAC pipeline is functioning correctly.
