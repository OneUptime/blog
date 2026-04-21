# How to Troubleshoot IPv6 Connectivity on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, macOS, Troubleshooting, Network Diagnostics, Ping6

Description: A systematic guide to diagnosing and fixing IPv6 connectivity problems on macOS, covering address assignment, routing, DNS, and firewall issues.

## Step 1: Check IPv6 Addresses

```bash
# Show all IPv6 addresses

ifconfig | grep inet6

# Check for non-link-local/non-loopback IPv6 addresses
# Global unicast is currently 2000::/3 (2xxx or 3xxx); fcxx/fdxx is ULA
ifconfig | grep 'inet6' | grep -v 'fe80\|::1'

# If only link-local (fe80::), the router may not be sending RAs
# or may not be advertising an IPv6 prefix.
# Check: is the router sending Router Advertisements?
```

## Step 2: Test Basic Connectivity

```bash
# Test loopback
ping6 ::1

# Test link-local gateway (replace fe80::1 with your gateway)
# Note: must include %en0 zone ID for link-local
ping6 fe80::1%en0

# Test global IPv6 connectivity to Google DNS
ping6 -c 4 2001:4860:4860::8888

# If ping6 2001:4860:4860::8888 works but ping6 google.com fails,
# the issue is DNS, not connectivity
```

## Step 3: Check Routing

```bash
# Show IPv6 routing table
netstat -rn -f inet6

# Look for default route:
# default   fe80::1%en0   UGcg  en0

# If no default route, add one:
sudo route -n add -inet6 default fe80::1%en0

# Verify the route was added
netstat -rn -f inet6 | grep default
```

## Step 4: Check DNS Resolution

```bash
# Test AAAA record resolution
dig AAAA google.com

# Test with specific IPv6 DNS server
dig AAAA google.com @2001:4860:4860::8888

# Check DNS configuration
networksetup -getdnsservers Wi-Fi
scutil --dns | head -20

# Flush DNS cache and retry
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
dig AAAA google.com
```

## Step 5: Trace the Path

```bash
# Traceroute over IPv6
traceroute6 2001:4860:4860::8888

# Or use ICMPv6 probes
traceroute6 -I 2001:4860:4860::8888

# If traceroute fails at first hop, the gateway may be unreachable or filtering probes
# If it fails at an intermediate hop, later routers may be filtering probes or there may be an upstream routing issue
```

## Common Issues and Fixes

```bash
# Issue: No global IPv6 address (only fe80::)
# Cause: Router not sending RAs, ISP/router not providing a prefix, or SLAAC disabled
# Fix: Enable automatic IPv6
networksetup -setv6automatic Wi-Fi

# Check if router is sending RAs (requires admin)
sudo tcpdump -i en0 -n 'icmp6 and ip6[40] == 134'
# Type 134 = Router Advertisement

# Issue: Global address exists but no connectivity
# Cause: pf rules, VPN, or security software blocking IPv6
sudo pfctl -sr | grep -Ei 'inet6|ipv6'
# Application Firewall mainly controls incoming app connections:
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
# Temporarily test by disabling third-party VPN or security filters,
# or by reviewing/removing custom pf rules.

# Issue: IPv6 DNS resolution fails but IPv4 works
# Fix: Add IPv6 DNS servers
networksetup -setdnsservers Wi-Fi 2001:4860:4860::8888 8.8.8.8

# Issue: Website doesn't load over IPv6 even with address
# Test: curl -6 http://ipv6.google.com
curl -6 -v https://ipv6.google.com 2>&1 | head -20
```

## Network Diagnostics Tool

```bash
# macOS built-in Wireless Diagnostics provides GUI guidance

# Open via:
# Hold Option, click Wi-Fi menu → Open Wireless Diagnostics
# For IPv6 settings: System Settings → Network → [interface] → Details → TCP/IP
```

## Check Firewall Rules for IPv6

```bash
# View macOS pf (packet filter) IPv6 rules
sudo pfctl -sr | grep -Ei 'inet6|ipv6'

# Check application firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --listapps
```

## Summary

Troubleshoot macOS IPv6 connectivity in layers: (1) check IPv6 address assignment with `ifconfig | grep inet6`, (2) test ping to `2001:4860:4860::8888`, (3) verify default route with `netstat -rn -f inet6 | grep default`, (4) test DNS with `dig AAAA google.com`, (5) use `traceroute6` to find where packets stop. Common fixes: re-enable SLAAC with `networksetup -setv6automatic`, add IPv6 DNS servers, flush cache with `dscacheutil -flushcache`.
