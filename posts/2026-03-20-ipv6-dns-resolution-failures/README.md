# How to Troubleshoot IPv6 DNS Resolution Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, Troubleshooting, AAAA Records, Network Diagnostics, Resolver

Description: Diagnose IPv6 DNS resolution failures including missing AAAA records, DNS64 issues, resolver configuration problems, and DNSSEC validation failures.

## Introduction

IPv6 DNS resolution failures prevent applications from connecting to IPv6-enabled services. Unlike IPv4 where a single A record lookup is sufficient, IPv6 requires AAAA record support at every layer: the resolver, the authoritative DNS server, and the application. This guide covers systematic diagnosis of IPv6 DNS failures.

## Step 1: Test Basic AAAA Resolution

```bash
# Test if your DNS resolver returns AAAA records

dig AAAA google.com
dig +short AAAA google.com

# Expected: one or more IPv6 addresses

# If no answer section, the domain has no AAAA answer from that resolver
# If SERVFAIL, the resolver path or DNSSEC validation has an issue
# If NXDOMAIN, the domain doesn't exist

# Test against Google's IPv6 DNS server
dig AAAA google.com @2001:4860:4860::8888

# Test against Cloudflare's IPv6 DNS
dig AAAA google.com @2606:4700:4700::1111
```

## Step 2: Check DNS Resolver Configuration

```bash
# Check configured DNS servers
cat /etc/resolv.conf

# Does your resolver support IPv6?
# Test if a configured IPv6 resolver is reachable via IPv6
NS6=$(awk '/^nameserver/ && /:/{print $2; exit}' /etc/resolv.conf)
[ -n "$NS6" ] && ping -6 -c 1 "$NS6" 2>/dev/null || \
    echo "No configured IPv6 DNS server reachable via IPv6"

# Check if systemd-resolved is active
resolvectl status 2>/dev/null | grep -A5 "DNS Servers"
resolvectl dns

# Check if dnsmasq serves AAAA
dig AAAA example.com @127.0.0.1
```

## Step 3: Test DNS Over IPv6 Transport

```bash
# Query DNS server using IPv6 transport
dig AAAA google.com @2001:4860:4860::8888

# If this fails but IPv4 DNS works, the problem is in your IPv6 connectivity
# or your DNS server doesn't support IPv6 transport

# Check if resolver is configured with IPv6 DNS servers
grep "nameserver" /etc/resolv.conf | grep ":"

# Force dig to use IPv6 transport
dig -6 AAAA google.com
```

## Step 4: Check for DNS64

DNS64 synthesizes AAAA records for IPv4-only hosts in IPv6-only networks:

```bash
# In DNS64 environments, AAAA lookups for the well-known IPv4-only name
# ipv4only.arpa return synthesized addresses using the NAT64 prefix
dig AAAA ipv4only.arpa

# If you get synthesized AAAA records here, DNS64 is active
# The prefix may be 64:ff9b::/96 or a network-specific prefix
dig +short AAAA ipv4only.arpa

# Test DNS64 + NAT64 connectivity against a known IPv4-only hostname
curl -6 https://ipv4.icanhazip.com
```

## Step 5: Diagnose Application DNS Issues

```bash
# Check how getaddrinfo resolves (what apps see)
python3 -c "
import socket
results = socket.getaddrinfo('google.com', 443, socket.AF_UNSPEC, socket.SOCK_STREAM)
for r in results:
    family = 'IPv6' if r[0] == socket.AF_INET6 else 'IPv4'
    print(f'{family}: {r[4][0]}')
"

# Check if application prefers IPv4 or IPv6
# /etc/gai.conf controls getaddrinfo() priority
cat /etc/gai.conf | grep -v "^#\|^$"

# Address ordering depends on getaddrinfo() sorting and local configuration
# To prefer IPv4 first, copy the full default precedence table into /etc/gai.conf
# and then raise the IPv4-mapped entry, for example:
# precedence ::ffff:0:0/96  100
```

## Step 6: DNSSEC Issues with AAAA Records

```bash
# Request DNSSEC records and inspect the reply
dig AAAA example.com +dnssec

# Compare with checking disabled on the resolver to isolate validation issues
dig AAAA example.com +dnssec +cdflag

# If the normal query returns SERVFAIL but +cdflag succeeds:
# - Check DNSSEC signatures on the zone
# - Check the resolver's DNSSEC trust anchors and validation state

# Check if a signed answer is marked authenticated by the resolver
dig AAAA example.com @your-resolver +dnssec  # Look for "ad" in the flags field
```

## Diagnostic Script

```bash
#!/bin/bash
# diagnose-ipv6-dns.sh

DOMAIN="${1:-google.com}"
echo "=== IPv6 DNS Diagnostics for $DOMAIN ==="

echo ""
echo "1. AAAA records from default resolver:"
result=$(dig +short AAAA "$DOMAIN" 2>/dev/null)
[ -n "$result" ] && echo "[OK] $result" || echo "[FAIL] No AAAA records"

echo ""
echo "2. AAAA from Google IPv4 DNS (8.8.8.8):"
result=$(dig +short AAAA "$DOMAIN" @8.8.8.8 2>/dev/null)
[ -n "$result" ] && echo "[OK] $result" || echo "[FAIL] No AAAA records or query failed"

echo ""
echo "3. AAAA from Google IPv6 DNS (2001:4860:4860::8888):"
result=$(dig +short AAAA "$DOMAIN" @2001:4860:4860::8888 2>/dev/null)
[ -n "$result" ] && echo "[OK] $result" || echo "[FAIL] No AAAA records or query failed (check IPv6 connectivity)"

echo ""
echo "4. Configured nameservers:"
awk '/^nameserver/{print "  "$2}' /etc/resolv.conf

echo ""
echo "5. Can connect to default nameserver?"
NS=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf)
ping -6 -c 1 -W 2 "$NS" &>/dev/null && echo "[OK] $NS reachable via IPv6" || \
    ping -c 1 -W 2 "$NS" &>/dev/null && echo "[IPv4] $NS only IPv4" || \
    echo "[FAIL] $NS unreachable"
```

## Conclusion

IPv6 DNS resolution failures commonly fall into a few categories: the domain has no AAAA record, the resolver path is misconfigured or unreachable over IPv6, DNS64/NAT64 synthesis is not happening where expected, the application's address selection is overriding what DNS returned, or DNSSEC validation is failing. Test each layer using `dig AAAA` with different DNS servers to isolate whether the problem is local resolver configuration, network connectivity, upstream DNS data, or address-selection policy. In DNS64 environments, check that the NAT64 prefix is correctly synthesizing AAAA records for IPv4-only hosts.
