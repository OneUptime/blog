# How to Use dig +short AAAA for Quick IPv6 DNS Lookup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, dig, DNS, AAAA Records, Network Diagnostics, DNS Troubleshooting

Description: Use dig with +short and AAAA query type for fast IPv6 address lookups, reverse DNS queries, and DNS troubleshooting scripts.

## Introduction

`dig` is the standard DNS query tool that gives precise control over DNS record lookups. For IPv6, the AAAA record type maps hostnames to IPv6 addresses. The `+short` flag returns only the IP address without the verbose DNS output, making it ideal for scripts. Understanding AAAA lookups is essential for verifying IPv6 DNS configuration.

## Basic AAAA Lookups

```bash
# Quick IPv6 address lookup (just the IP)

dig +short AAAA google.com

# Full AAAA query with all details
dig AAAA google.com

# Query a specific DNS server for AAAA records
dig AAAA google.com @8.8.8.8

# Query using IPv6 DNS server
dig AAAA google.com @2001:4860:4860::8888

# Look up AAAA and A records together
dig google.com A google.com AAAA

# Check if hostname has AAAA record
result=$(dig +short AAAA example.com)
[ -n "$result" ] && printf '%s\n' "$result" || echo "No AAAA record"
```

## Reverse IPv6 DNS Lookup (PTR)

```bash
# Reverse lookup for an IPv6 address
dig -x 2001:4860:4860::8888

# Quick reverse lookup (just hostname)
dig +short -x 2001:4860:4860::8888

# Manual PTR query (reverse the nibbles)
# 2001:4860:4860::8888 becomes:
# 8.8.8.8.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.6.8.4.0.6.8.4.1.0.0.2.ip6.arpa
dig +short PTR 8.8.8.8.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.6.8.4.0.6.8.4.1.0.0.2.ip6.arpa
```

## DNS Verification Scripts

```bash
#!/bin/bash
# check-ipv6-dns.sh - Verify AAAA records for a list of hostnames

HOSTNAMES=(
    "google.com"
    "cloudflare.com"
    "example.com"
    "your-server.example.com"
)

echo "=== AAAA Record Check ==="
for host in "${HOSTNAMES[@]}"; do
    result=$(dig +short AAAA "$host" 2>/dev/null | head -1)
    if [ -n "$result" ]; then
        echo "[OK]   $host → $result"
    else
        echo "[MISS] $host → No AAAA record"
    fi
done
```

## Checking DNS Propagation

```bash
# Check AAAA record across multiple DNS servers
check_dns() {
    local domain="$1"
    local servers=("8.8.8.8" "1.1.1.1" "208.67.222.222" "9.9.9.9")

    echo "AAAA records for $domain:"
    for server in "${servers[@]}"; do
        result=$(dig +short AAAA "$domain" @"$server" 2>/dev/null)
        printf "  %-18s %s\n" "$server:" "${result:-not found}"
    done
}

check_dns "example.com"

# Check TTL for cache invalidation
dig AAAA example.com +noall +answer | awk 'NR==1 {print "TTL:", $2, "seconds"}'
```

## Diagnosing AAAA Record Issues

```bash
# Check if NXDOMAIN (domain doesn't exist) vs NOERROR with no AAAA
dig AAAA example.com | grep "status:"
# NOERROR + empty answer = domain exists but no AAAA record
# NXDOMAIN = domain doesn't exist at all

# Check for CNAME that resolves to AAAA
dig AAAA www.example.com +trace

# Verify AAAA from authoritative server
# Find authoritative NS first
NS=$(dig +short NS example.com | head -1)
echo "Authoritative NS: $NS"
dig AAAA example.com @"$NS" +short

# Request DNSSEC records for the AAAA response
# If your resolver validates DNSSEC, look for the "ad" flag in the header.
dig AAAA example.com +dnssec
```

## Batch DNS Lookup Script

```bash
#!/bin/bash
# batch-aaaa-lookup.sh - Lookup AAAA for many domains

domains_file="${1:-/tmp/domains.txt}"

while IFS= read -r domain; do
    [ -z "$domain" ] && continue
    [ "${domain:0:1}" = "#" ] && continue  # skip comments

    ipv6=$(dig +short AAAA "$domain" 2>/dev/null | grep ":" | head -1)
    if [ -n "$ipv6" ]; then
        echo "$domain,$ipv6"
    else
        echo "$domain,NO_AAAA"
    fi
done < "$domains_file"
```

## Conclusion

`dig +short AAAA hostname` returns the IPv6 address for any domain with a AAAA record. Use `dig -x ipv6address` for reverse PTR lookups. Query specific DNS servers with `@server` to diagnose propagation issues. When building infrastructure scripts, combine AAAA lookups with connectivity tests (`ping6`) to verify end-to-end IPv6 reachability from DNS name to network path.
