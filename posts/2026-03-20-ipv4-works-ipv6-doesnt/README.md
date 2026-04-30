# How to Troubleshoot IPv4 Works but IPv6 Doesn't

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Troubleshooting, Dual-Stack, IPv4, Network Diagnostics, Connectivity

Description: Systematic approach to diagnosing why IPv4 works but IPv6 fails on the same host, covering address assignment, routing, DNS, firewall, and application issues.

## Introduction

When IPv4 works but IPv6 doesn't, the issue is almost always in IPv6-specific configuration: the IPv6 address isn't assigned, the default route is missing, ICMPv6 is blocked, or the DNS resolver isn't returning AAAA records. Because IPv6 has separate addressing, routing, and neighbor discovery from IPv4, each layer must be checked independently.

## Quick Diagnosis Checklist

```bash
#!/bin/bash
# quick-ipv6-check.sh

echo "=== IPv4 vs IPv6 Quick Comparison ==="

# IPv4 check

echo ""
echo "IPv4:"
IPV4=$(curl -4 -s --max-time 5 https://icanhazip.com 2>/dev/null)
echo "  Public IP: ${IPV4:-NOT WORKING}"

# IPv6 check
echo ""
echo "IPv6:"
IPV6=$(curl -6 -s --max-time 5 https://icanhazip.com 2>/dev/null)
echo "  Public IP: ${IPV6:-NOT WORKING}"

# If IPv4 works but IPv6 doesn't, run the detailed checks below
```

## Step 1: Check IPv6 Address Assignment

```bash
# Do we have a global IPv6 address?
ip -6 addr show scope global

# IPv4 for comparison:
ip -4 addr show scope global

# If no IPv6 global address:
# → Check if IPv6 is disabled
cat /proc/sys/net/ipv6/conf/all/disable_ipv6

# → Check for Router Advertisement (if rdisc6 is installed)
sudo rdisc6 eth0 2>/dev/null | head -10

# → If the RA Managed (M) flag is set, check DHCPv6 logs
journalctl -b 2>/dev/null | grep -i dhcp6 | tail -20
```

## Step 2: Check IPv6 Default Route

```bash
# IPv4 default route
ip -4 route show default

# IPv6 default route
ip -6 route show default

# If IPv6 default route is missing:
# → Router isn't sending RAs with lifetime > 0
# → accept_ra is disabled
# → Need to add static route

# Quick fix: add a static default route
# Replace fe80::1 and eth0 with your actual router and interface
sudo ip -6 route add default via fe80::1 dev eth0
```

## Step 3: Test IPv6 Connectivity at Each Layer

```bash
# First hop: Can we reach the gateway?
ping6 -I eth0 fe80::1  # Replace fe80::1 with the router from "ip -6 route show default"

# Layer 3: Can we reach a known IPv6 host?
ping6 -c 3 2001:4860:4860::8888  # Google DNS

# DNS: Can we resolve AAAA records?
dig +short AAAA google.com

# HTTP: Can we connect over IPv6?
curl -6 -s -o /dev/null -w "%{http_code}" https://ipv6.google.com

echo ""
echo "Results should all succeed if IPv6 is working"
```

## Step 4: Compare IPv4 vs IPv6 at Each Layer

```bash
# DNS: Do we get both A and AAAA records?
echo "A records:"
dig +short A google.com

echo "AAAA records:"
dig +short AAAA google.com

# If AAAA records are empty:
# → Domain may not have AAAA
# → DNS resolver may not support AAAA
# → Try: dig +short AAAA google.com @8.8.8.8

# Ping both:
echo "IPv4 ping:"
ping -c 3 -W 2 google.com 2>&1 | tail -2

echo "IPv6 ping:"
ping6 -c 3 -W 2 ipv6.google.com 2>&1 | tail -2
```

## Step 5: Check Firewall

```bash
# IPv4 firewall
sudo iptables -L -n | grep "policy\|DROP\|REJECT" | head -5

# IPv6 firewall
sudo ip6tables -L -n | grep "policy\|DROP\|REJECT" | head -5

# Common issue: iptables has permissive rules but ip6tables has DROP policy
# Check if ip6tables is blocking everything
sudo ip6tables -L INPUT -n | head -3
sudo ip6tables -L FORWARD -n | head -3

# Quick test: flush ip6tables temporarily
sudo ip6tables -F && sudo ip6tables -P INPUT ACCEPT
ping6 -c 2 2001:4860:4860::8888
```

## Step 6: Application-Level IPv6 Check

```bash
# Check if application is listening on IPv6
ss -tlnp6 | grep ":80\|:443"

# Compare with IPv4 listeners
ss -tlnp4 | grep ":80\|:443"

# Check if nginx/apache is configured for IPv6
grep -r "listen.*ipv6\|listen.*\[::\]" /etc/nginx/sites-enabled/ 2>/dev/null
grep -RE "Listen .*\\[.*\\]:|<VirtualHost .*\\[.*\\]:" /etc/apache2/ports.conf /etc/apache2/sites-enabled/ 2>/dev/null

# Test application over IPv6
curl -6 -I http://[::1]/  # Tests the IPv6 loopback listener
```

## Common Causes Table

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| No IPv6 address | `disable_ipv6=1` or no RA | Enable IPv6, check router |
| Address but no route | RA with `lifetime=0` | Static default route |
| Route but ping fails | ip6tables DROP | Allow ICMPv6 |
| Ping works, HTTP fails | App not listening on IPv6 | Configure `listen [::]:80` |
| DNS returns no AAAA | Resolver issue | Use IPv6-capable DNS server |

## Conclusion

When IPv4 works and IPv6 doesn't, work through the stack systematically: address → route → ping → DNS → HTTP. Each layer has an IPv6-specific component that must be checked independently. The most common causes are missing IPv6 address (disabled or no RA), missing default route, ip6tables blocking ICMPv6, application not listening on `[::]`, or DNS resolver not returning AAAA records.
