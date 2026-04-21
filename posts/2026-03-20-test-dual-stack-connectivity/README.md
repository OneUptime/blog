# How to Test Dual-Stack Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv4, Dual-Stack, Testing, Network Troubleshooting

Description: Learn how to test and validate dual-stack IPv4 and IPv6 connectivity using ping, traceroute, curl, online tools, and automated test scripts.

## Overview

Testing dual-stack connectivity means verifying that both IPv4 and IPv6 paths work independently and that address selection behaves correctly. A common mistake is assuming that because IPv4 works, the network is correctly configured - IPv6 could be silently broken without detection.

## Basic Connectivity Tests

```bash
# IPv4 ping

ping -4 -c 4 8.8.8.8

# IPv6 ping
ping -6 -c 4 2001:4860:4860::8888

# On macOS/BSD
ping  8.8.8.8
ping6 2001:4860:4860::8888

# On Windows
ping 8.8.8.8
ping /6 2001:4860:4860::8888

# Test link-local (must specify interface)
ping -6 fe80::1%eth0
```

## Traceroute Both Paths

```bash
# IPv4 traceroute
traceroute -4 example.com         # Linux
tracert /4 example.com            # Windows

# IPv6 traceroute
traceroute -6 example.com         # Linux
tracert /6 example.com            # Windows

# Compare: if IPv4 and IPv6 paths diverge significantly, investigate
# routing policy. Asymmetric paths increase troubleshooting complexity.
```

## DNS Verification

```bash
# Confirm both A and AAAA records exist
dig A    example.com
dig AAAA example.com

# Test that resolver returns both families
resolvectl query example.com         # Linux systemd-resolved
dns-sd -G v4v6 example.com          # macOS
Resolve-DnsName example.com          # Windows PowerShell

# Verify resolver itself is reachable over both families
dig @8.8.8.8    A example.com       # IPv4 resolver
dig @2001:4860:4860::8888 A example.com  # IPv6 resolver
```

## HTTP/HTTPS Connectivity with curl

```bash
# Force IPv4
curl -4 -v https://example.com 2>&1 | grep "Connected to"
# Connected to example.com (<IPv4 address>) port 443

# Force IPv6
curl -6 -v https://example.com 2>&1 | grep "Connected to"
# Connected to example.com (<IPv6 address>) port 443

# Show which address family was used (no force)
curl -v https://example.com 2>&1 | grep "Connected to"

# Test timing for both families
curl -4 -o /dev/null -s -w "IPv4 connect: %{time_connect}s total: %{time_total}s\n" https://example.com
curl -6 -o /dev/null -s -w "IPv6 connect: %{time_connect}s total: %{time_total}s\n" https://example.com
```

## Online Testing Tools

| Tool | URL | Tests |
|---|---|---|
| test-ipv6.com | https://test-ipv6.com | Browser IPv6 connectivity |
| ipv6-test.com | https://ipv6-test.com | IPv6 readiness score |
| whatismyv6ip.com | https://www.whatismyv6ip.com | Shows current IPv4/IPv6 address |
| RIPE Atlas | https://atlas.ripe.net | Global IPv4/IPv6 path tests |
| Hurricane Electric | https://bgp.he.net | IPv6 BGP prefix visibility |

## Local Interface Verification

```bash
# Check both addresses are assigned
ip addr show eth0
# Should show both:
#   inet 192.0.2.10/24
#   inet6 2001:db8::10/64

# Check routing tables
ip route show            # IPv4 default route
ip -6 route show         # IPv6 default route (must have!)

# If IPv6 default route missing:
ip -6 route show | grep default
# Empty → check RA or configure static: ip -6 route add default via 2001:db8::1

# Check for IPv6 default route via RA
ip -6 route show | grep "proto ra"
```

## Application Socket Tests

```bash
# Check service listens on both IPv4 and IPv6
ss -tlnp | grep :443
# tcp  LISTEN  0  128  0.0.0.0:443  0.0.0.0:*   # IPv4
# tcp  LISTEN  0  128  [::]:443     [::]:*       # IPv6 needed

# Test HTTPS service on a specific IPv6 address while preserving Host/SNI
curl -6 --resolve "www.example.com:443:[2001:db8::10]" https://www.example.com/

# Test SSH over IPv6
ssh -6 admin@2001:db8::10

# OpenSSL test (TLS over IPv6)
openssl s_client -connect [2001:db8::10]:443 -servername www.example.com
```

## Automated Dual-Stack Health Check Script

```bash
#!/bin/bash
# dual-stack-check.sh - basic dual-stack health verification

TARGETS_V4=("8.8.8.8" "1.1.1.1")
TARGETS_V6=("2001:4860:4860::8888" "2606:4700:4700::1111")
HOSTNAME="example.com"

echo "=== IPv4 Connectivity ==="
for t in "${TARGETS_V4[@]}"; do
    if ping -4 -c 1 -W 2 "$t" &>/dev/null; then
        echo "OK   $t"
    else
        echo "FAIL $t"
    fi
done

echo ""
echo "=== IPv6 Connectivity ==="
for t in "${TARGETS_V6[@]}"; do
    if ping -6 -c 1 -W 2 "$t" &>/dev/null; then
        echo "OK   $t"
    else
        echo "FAIL $t"
    fi
done

echo ""
echo "=== DNS Records: $HOSTNAME ==="
A=$(dig +short A "$HOSTNAME" | head -1)
AAAA=$(dig +short AAAA "$HOSTNAME" | head -1)
echo "A    : ${A:-MISSING}"
echo "AAAA : ${AAAA:-MISSING}"

echo ""
echo "=== HTTP Test: $HOSTNAME ==="
V4=$(curl -4 -s -o /dev/null -w "%{http_code}" --max-time 5 "https://$HOSTNAME")
V6=$(curl -6 -s -o /dev/null -w "%{http_code}" --max-time 5 "https://$HOSTNAME")
echo "IPv4 HTTP: $V4"
echo "IPv6 HTTP: $V6"
```

## MTU and Path MTU Discovery

```bash
# Test PMTUD on IPv6 path (critical for large packets)
ping -6 -s 1400 2001:4860:4860::8888

# If Packet Too Big is blocked by firewall, large transfers silently fail
# Test with different sizes:
for size in 576 1280 1400 1452 1480; do
    result=$(ping -6 -c 1 -s $size 2001:4860:4860::8888 2>&1 | tail -1)
    echo "$size bytes: $result"
done
```

## Summary

Test dual-stack by independently verifying IPv4 and IPv6 with `ping -4/-6`, `traceroute -4/-6`, and `curl -4/-6`. Confirm DNS returns both A and AAAA records. Verify the IPv6 default route exists (`ip -6 route show | grep default`) and services listen on `[::]:port`. Use the health check script to automate verification. Always test PMTUD by pinging with large packet sizes (`ping -6 -s 1400`) - blocked Packet Too Big ICMPv6 causes silent large-transfer failures.
