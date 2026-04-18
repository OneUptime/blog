# How to Troubleshoot Slow DNS Resolution Times

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Performance, Latency, Troubleshooting, Linux, Networking

Description: Identify and fix slow DNS resolution by diagnosing resolver latency, cache miss rates, TCP fallback, DNSSEC overhead, and network path issues.

## Introduction

Slow DNS resolution directly impacts application startup time, connection establishment, and user experience. A normal cached DNS response should complete in under 1ms; an uncached resolution from root servers should take 50-200ms. Anything slower indicates a problem with the resolver, network path, or DNS server configuration.

## Measure DNS Resolution Time

```bash
# Basic timing:

time dig google.com
# "Query time: 45 msec" in dig output = actual DNS time (not total time)

# Measure cached vs uncached:
# First query (may be uncached):
dig google.com | grep "Query time"

# Second query (should be cached):
dig google.com | grep "Query time"
# Should be < 1ms if cached by local resolver

# Measure from application perspective:
time getent hosts google.com
# This uses the full NSS resolver stack (same as application)

# Benchmark multiple queries:
for i in $(seq 1 10); do
    dig google.com | grep "Query time"
done
```

## Identify Resolver Latency

```bash
# Test response time from configured resolver:
RESOLVER=$(grep ^nameserver /etc/resolv.conf | head -1 | awk '{print $2}')
echo "Resolver: $RESOLVER"
dig @$RESOLVER google.com | grep -E "Query time|SERVER"

# Compare different resolvers:
for resolver in 8.8.8.8 1.1.1.1 208.67.222.222; do
    RT=$(dig @$resolver google.com | grep "Query time" | awk '{print $4}')
    echo "$resolver: ${RT}ms"
done

# The fastest resolver for your location is usually the right choice
```

## Check Cache Hit Rate

```bash
# systemd-resolved cache statistics:
resolvectl statistics
# Look for: "Current Cache Size" and "Cache Hits"

# Unbound cache statistics:
unbound-control stats | grep "cache"
# cache.hits / (cache.hits + cache.misses) = hit rate
# Target: > 80% hit rate

# BIND9 statistics (if using BIND as caching resolver):
rndc stats && tail -100 /var/named/data/named_stats.txt | grep cache

# Low cache hit rate = TTLs are too short or resolver is being restarted often
```

## TCP Fallback Issue

```bash
# If DNS is using TCP instead of UDP, it's slower due to handshake:
# Check with packet capture:
tcpdump -i eth0 -n 'tcp port 53 or udp port 53' -q | head -20
# If you see many TCP port 53 connections: something is causing TCP fallback

# Common causes:
# - DNS responses truncated (TC bit set) due to large DNSSEC responses
# - Firewall blocking UDP 53 but allowing TCP 53
# - Resolver configured for TCP-only

# Check if UDP is blocked:
nc -zu $RESOLVER 53 && echo "UDP OK" || echo "UDP blocked"
nc -z $RESOLVER 53 && echo "TCP OK" || echo "TCP blocked"

# Check for truncation (causes TCP retry):
dig example.com | grep -i "truncated"
# Or: flags: tc
```

## DNSSEC Overhead

```bash
# DNSSEC validation adds overhead due to cryptographic signatures:
# Test with and without DNSSEC:

# Normal query (with DNSSEC if enabled):
time dig google.com 2>&1 | grep -E "Query time|real"

# Disable DNSSEC checking for this query:
time dig +cd google.com 2>&1 | grep -E "Query time|real"

# If +cd is significantly faster: DNSSEC validation is the bottleneck
# This can indicate: recursive resolver DNSSEC processing is slow
# Or: DNSSEC keys/signatures are complex (many RRSIGs)

# Check if upstream resolver validates DNSSEC:
dig +dnssec @8.8.8.8 google.com | grep "^;; flags:"
# Look for "ad" in flags = upstream resolver validated and this domain is signed
```

## Slow Authoritative Nameserver

```bash
# If uncached lookups are slow, the authoritative server may be slow:
# Find authoritative servers:
dig NS example.com +short

# Measure authoritative response time:
for ns in $(dig NS example.com +short); do
    RT=$(dig @$ns example.com | grep "Query time" | awk '{print $4}')
    echo "$ns: ${RT}ms"
done

# If authoritative server is slow: contact domain owner
# If authoritative server is unreachable: check routing path
# Use mtr to find path issues:
mtr -n $(dig NS example.com +short | head -1)
```

## Fix: Increase Cache TTL

```bash
# Short TTLs cause frequent uncached lookups:
# Check current TTL for a domain:
dig example.com | grep -A1 "ANSWER SECTION" | tail -1 | awk '{print $2}'
# Column 2 = TTL in seconds

# If TTL is very low (< 60): this domain will cause frequent resolver queries
# Solution (if you own the domain): increase TTL in your DNS configuration

# Local workaround: add to /etc/hosts (bypasses DNS):
echo "93.184.216.34 example.com" >> /etc/hosts
# Only suitable for static IPs that don't change
```

## Conclusion

Slow DNS resolution has four main causes: slow recursive resolver (switch to faster resolver like 1.1.1.1), cache miss rate (check hit rate with `resolvectl statistics`), TCP fallback from UDP blocking or response truncation, and DNSSEC overhead. Measure with `dig` and compare `Query time` values between resolvers, cached vs uncached, and with/without DNSSEC. For most environments, switching to a fast local caching resolver (Unbound or systemd-resolved) dramatically improves DNS response times.
