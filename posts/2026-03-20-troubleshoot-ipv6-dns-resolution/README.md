# How to Troubleshoot IPv6 DNS Resolution Failures - Troubleshoot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, Troubleshooting, AAAA Records, Network Diagnostics

Description: A systematic troubleshooting guide for diagnosing and resolving IPv6 DNS resolution failures, from AAAA record issues to resolver configuration problems.

## Common Causes of IPv6 DNS Resolution Failures

1. **Missing AAAA record**: Domain has no IPv6 address configured
2. **DNS resolver not listening on IPv6**: Resolver only accepts IPv4 queries
3. **Firewall blocking DNS over IPv6**: Port 53 UDP/TCP blocked for IPv6
4. **DNSSEC validation failure**: Zone signing error causes SERVFAIL
5. **Resolver not configured**: Client using a resolver that doesn't answer or forward AAAA queries
6. **DNS64 misconfiguration**: Synthesis prefix mismatch

## Step 1: Check if the AAAA Record Exists

```bash
# Query directly against authoritative nameserver to bypass caching

dig AAAA www.example.com @$(dig NS example.com +short | head -1) +short

# If empty: confirm the full dig output; NOERROR with an empty ANSWER means no AAAA record exists for this name
# If returns IP: AAAA record exists

# Check if there's an A record (domain exists, just no IPv6)
dig A www.example.com +short
```

## Step 2: Verify DNS Resolver is Listening on IPv6

```bash
# Check which DNS server the client is using
cat /etc/resolv.conf

# Test if the DNS server accepts IPv6 transport
dig AAAA google.com @::1  # localhost IPv6
dig AAAA google.com @2001:4860:4860::8888  # Google Public DNS over IPv6

# Check if the DNS server is listening on IPv6 TCP or UDP
ss -6 -lntup | grep -E '(:53[[:space:]]|:53$)'
# Empty output means no DNS server is listening on IPv6 TCP/UDP port 53
```

## Step 3: Check Firewall Rules for IPv6 DNS

```bash
# Check ip6tables for port 53 rules
ip6tables -L -n | grep -E '53|dns'

# If INPUT policy drops inbound DNS and no earlier ACCEPT rule allows port 53 over IPv6, add rules appropriate for your firewall:
ip6tables -A INPUT -p udp --dport 53 -j ACCEPT
ip6tables -A INPUT -p tcp --dport 53 -j ACCEPT

# Test TCP connectivity to DNS server over IPv6
nc -6 -vz -w 3 2001:4860:4860::8888 53
# "succeeded" or "Connected" = TCP port is reachable
# Timeout = firewall or routing issue (or server not reachable)
```

## Step 4: Test DNS Resolution Path Step by Step

```bash
# 1. Test local resolver
dig AAAA example.com @127.0.0.1

# 2. Test over IPv6 to local resolver
dig AAAA example.com @::1

# 3. Test against upstream resolver
dig AAAA example.com @8.8.8.8

# 4. Query authoritative nameserver directly
NS=$(dig NS example.com +short | head -1)
dig AAAA example.com @$NS
```

## Step 5: Diagnose DNSSEC Issues

```bash
# Check if DNSSEC is causing SERVFAIL
# Add +cdflag to set the DNSSEC Checking Disabled bit
dig AAAA example.com +cdflag

# If query succeeds with +cdflag but fails without:
# DNSSEC validation is failing
# Check zone signing status and RRSIG records returned for the AAAA RRset:
dig DNSKEY example.com +dnssec
dig AAAA example.com +dnssec

# Detailed DNSSEC validation output
delv AAAA example.com
```

## Step 6: Check for Negative Caching

```bash
# Check if a negative AAAA result is cached (NXDOMAIN or NODATA)
dig AAAA example.com +ttlid | grep -E 'SOA|status'
# If status is NOERROR with empty answer: NODATA (cached negative)
# TTL on SOA record shows how long the negative is cached

# Wait for negative cache to expire, or flush the resolver cache
# For Unbound:
unbound-control flush_type example.com AAAA
# For BIND:
rndc flush
# For systemd-resolved:
resolvectl flush-caches
```

## Step 7: Diagnose getaddrinfo Application Issues

Applications use `getaddrinfo()` which may have different behavior than `dig`:

```bash
# Test what getaddrinfo returns for a hostname
python3 -c "
import socket
try:
    results = socket.getaddrinfo('example.com', 80)
    for r in results:
        print(f'Family: {r[0].name}, Address: {r[4][0]}')
except Exception as e:
    print(f'Error: {e}')
"

# Check nsswitch.conf - what hostname resolution order is used
cat /etc/nsswitch.conf | grep hosts
# Should include a DNS-capable source such as dns or resolve
```

## Step 8: Check for IPv6 Disabled Globally

```bash
# Verify IPv6 is not disabled by default or on all interfaces
sysctl net.ipv6.conf.default.disable_ipv6
sysctl net.ipv6.conf.all.disable_ipv6
# Values should be 0 (enabled); also check net.ipv6.conf.<interface>.disable_ipv6 for the affected interface

# If disabled via sysctl, re-enable:
sysctl -w net.ipv6.conf.all.disable_ipv6=0

# Check if IPv6 is disabled in GRUB kernel parameters
grep -o 'ipv6.disable=[^ ]*' /proc/cmdline
# ipv6.disable=1 means IPv6 was disabled at boot
```

## Diagnostic Script

```bash
#!/bin/bash
# ipv6-dns-diag.sh - IPv6 DNS resolution diagnostic

DOMAIN=${1:-"example.com"}
echo "=== IPv6 DNS Diagnostics for $DOMAIN ==="

echo -e "\n[1] AAAA Record Check"
dig AAAA "$DOMAIN" +short | head -3

echo -e "\n[2] DNS Server IPv6 Support"
ss -6 -lntup 2>/dev/null | grep -E '(:53[[:space:]]|:53$)' || echo "No IPv6 DNS TCP/UDP listeners found"

echo -e "\n[3] IPv6 Connectivity"
ping -6 -c 2 2001:4860:4860::8888 2>/dev/null && echo "IPv6 OK" || echo "IPv6 BROKEN"

echo -e "\n[4] DNSSEC Check"
dig AAAA "$DOMAIN" +dnssec 2>/dev/null | grep -E 'status|RRSIG' | head -3

echo -e "\n[5] Negative Cache Check"
dig AAAA "$DOMAIN" +ttlid | grep -E 'SOA|NOERROR|NXDOMAIN' | head -2
```

## Summary

IPv6 DNS resolution failures follow a consistent troubleshooting path: verify the AAAA record exists, confirm the DNS resolver listens on IPv6 and accepts queries, check firewall rules for IPv6 port 53, diagnose DNSSEC validation errors with `+cdflag`, flush negative caches, and verify IPv6 is not disabled at the OS level. The `dig`, `delv`, and Python `socket.getaddrinfo()` tests cover different layers of the resolution stack.
