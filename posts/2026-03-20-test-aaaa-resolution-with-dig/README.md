# How to Test AAAA Record Resolution with dig

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, dig, AAAA Records, DNS Testing

Description: A comprehensive guide to using the dig command to test IPv6 AAAA record resolution, with practical examples for troubleshooting DNS issues.

## Basic AAAA Query with dig

The most basic way to query for a AAAA record is:

```bash
# Query for AAAA record of a hostname

dig AAAA example.com

# Short output (just the answer)
dig AAAA example.com +short

# Query against a specific DNS server
dig AAAA example.com @8.8.8.8

# Query against a specific server using IPv6 transport
dig AAAA example.com @2001:4860:4860::8888
```

## Understanding dig AAAA Output

```bash
# Full dig output with explanation
dig AAAA google.com

# Output:
# ; <<>> DiG 9.16.1 <<>> AAAA google.com
# ;; global options: +cmd
# ;; Got answer:
# ;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 12345
# ;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1
#
# ;; QUESTION SECTION:
# ;google.com.            IN  AAAA
#
# ;; ANSWER SECTION:                     ← This is the IPv6 address
# google.com.    55  IN  AAAA  2607:f8b0:4004:c08::65
#
# ;; Query time: 10 msec
# ;; SERVER: 8.8.8.8#53(8.8.8.8)        ← DNS server used
# ;; WHEN: Fri Mar 20 10:00:00 UTC 2026
# ;; MSG SIZE rcvd: 67
```

## Common dig AAAA Queries for Troubleshooting

```bash
# Check if a domain has any AAAA records
dig AAAA www.example.com +short
# Empty output usually means no AAAA answer; run without +short to confirm status

# Check AAAA record TTL (useful during TTL changes)
dig AAAA www.example.com +noall +answer
# www.example.com. 3600 IN AAAA 2001:db8::1
#                  ^^^^--- TTL in seconds

# Check authoritative answer (not from cache)
AUTH_NS=$(dig NS example.com +short | head -n 1)
dig AAAA www.example.com +norecurse @"$AUTH_NS"

# Request DNSSEC records (RRSIGs) when available
dig AAAA www.example.com +dnssec

# Check NXDOMAIN vs NODATA for AAAA
# NXDOMAIN: domain doesn't exist at all
# NODATA: domain exists, but no AAAA record
dig AAAA no-aaaa.example.com
# status: NOERROR with empty ANSWER = NODATA (has A but no AAAA)
# status: NXDOMAIN = domain doesn't exist
```

## Testing AAAA Records Against Multiple DNS Servers

```bash
# Compare AAAA responses from different resolvers
for DNS in 8.8.8.8 1.1.1.1 9.9.9.9 2001:4860:4860::8888; do
    echo -n "$DNS: "
    dig AAAA example.com @$DNS +short
done
```

## Verifying DNS64 Synthesis

When using DNS64+NAT64, verify that synthesized AAAA records use the NAT64 prefix:

```bash
# Query via a DNS64 resolver for the special IPv4-only name
dig AAAA ipv4only.arpa @2001:4860:4860::64 +short
# Expected with the well-known /96 prefix: 64:ff9b::c000:aa and 64:ff9b::c000:ab

# Verify the prefix is correct for a resolver using 64:ff9b::/96
dig AAAA ipv4only.arpa @2001:4860:4860::64 +short | grep -c "^64:ff9b::"
# Should return: 2 (synthesis working)

# Compare with native resolver (should return empty because ipv4only.arpa has no native AAAA records)
dig AAAA ipv4only.arpa @8.8.8.8 +short
# Should return: (empty)
```

## Testing Reverse DNS (PTR) for IPv6 Addresses

```bash
# Test reverse lookup for an IPv6 address
dig -x 2001:db8::1 +short
# If a PTR record exists: server1.example.com.

# Without +short to see full response
dig -x 2001:db8::1

# Test against specific server
dig -x 2001:db8::1 @127.0.0.1
```

## Checking Response Time and Caching

```bash
# Check query time
dig AAAA google.com | grep "Query time"
# Example: 50 msec

# Run again and compare (recursive resolvers may answer from cache)
dig AAAA google.com | grep "Query time"
# Example cached response: 1 msec

# To avoid a recursive resolver cache, query an authoritative name server
AUTH_NS=$(dig NS google.com +short | head -n 1)
dig AAAA google.com @"$AUTH_NS" +norecurse | grep "Query time"

# Check DNSSEC validation separately
dig AAAA google.com +cd  # asks resolver to disable DNSSEC validation
```

## Batch Testing Multiple Domains

```bash
#!/bin/bash
# Test AAAA records for a list of domains
# Usage: ./test-aaaa.sh domains.txt

DOMAINS_FILE=$1
DNS_SERVER=${2:-8.8.8.8}

echo "Testing AAAA records against $DNS_SERVER"
echo "---"

while IFS= read -r DOMAIN; do
    [ -z "$DOMAIN" ] && continue
    RESULT=$(dig AAAA "$DOMAIN" @"$DNS_SERVER" +short | head -n 1)
    if [ -z "$RESULT" ]; then
        echo "MISSING: $DOMAIN (no AAAA record)"
    else
        echo "OK: $DOMAIN → $RESULT"
    fi
done < "$DOMAINS_FILE"
```

## Testing Over IPv6 Transport

```bash
# Force dig to use IPv6 transport for the query (not just query type)
dig -6 AAAA example.com @2001:4860:4860::8888

# By default this sends the DNS query over IPv6 UDP; dig retries over TCP if the response is truncated
# Verify with: dig -6 A example.com @2001:4860:4860::8888
# SERVER shows IPv6 address used
```

## Summary

`dig AAAA <hostname>` is the primary tool for testing IPv6 DNS records. Use `+short` for concise output, `@<server>` to test specific resolvers, `-x <ipv6-addr>` for reverse lookups, and loop through multiple DNS servers to compare responses. For DNS64 verification, check that synthesized addresses start with the NAT64 prefix (e.g., `64:ff9b::`). Always check both the presence of AAAA records and the NODATA/NXDOMAIN status when debugging missing IPv6 resolution.
