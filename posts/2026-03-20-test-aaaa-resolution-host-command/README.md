# How to Test AAAA Record Resolution with host Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, Host command, AAAA Records, DNS Testing

Description: Learn how to use the `host` command to query IPv6 AAAA records and perform reverse DNS lookups for IPv6 addresses.

## Introduction to the host Command

The `host` command is a simple DNS lookup utility available on Linux and macOS. It is concise and easy to use for quick DNS checks, especially when you want clean, minimal output.

## Basic AAAA Queries

```bash
# Query default records for a domain (A, AAAA, MX, and in newer BIND versions HTTPS)

host example.com

# Query only AAAA records
host -t AAAA example.com

# Query against a specific DNS server
host -t AAAA example.com 8.8.8.8

# Query against IPv6 DNS server
host -t AAAA example.com 2001:4860:4860::8888
```

## Understanding host Output

```bash
$ host -t AAAA google.com

# Example output (addresses vary by resolver and location):
google.com has IPv6 address 2a00:1450:4009:c08::64
google.com has IPv6 address 2a00:1450:4009:c08::66
google.com has IPv6 address 2a00:1450:4009:c08::65
google.com has IPv6 address 2a00:1450:4009:c08::8b

# If no AAAA record exists:
$ host -t AAAA ipv4only.example.com
ipv4only.example.com has no AAAA record
```

## Testing Both A and AAAA Together

```bash
# The default host output includes A, AAAA, and MX records
# Newer BIND versions may also include HTTPS records
host example.com

# Example output (records may vary):
# example.com has address 172.66.147.243        (A record)
# example.com has address 104.20.23.154         (A record)
# example.com has IPv6 address 2606:4700:10::ac42:93f3  (AAAA record)
# example.com has IPv6 address 2606:4700:10::6814:179a  (AAAA record)
# example.com mail is handled by 0 .            (MX record)

# Query only AAAA explicitly
host -t AAAA example.com
```

## Reverse DNS Lookup for IPv6 Addresses

```bash
# Reverse lookup: IPv6 address → hostname
host 2001:4860:4860::8888

# Example output:
# 8.8.8.8.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.6.8.4.0.6.8.4.1.0.0.2.ip6.arpa domain name pointer dns.google.

# Explicit PTR query with -t PTR
host -t PTR 8.8.8.8.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.6.8.4.0.6.8.4.1.0.0.2.ip6.arpa
# Or let host handle the conversion automatically:
host 2001:4860:4860::8888

# Test against a specific server
host 2001:4860:4860::8888 8.8.8.8
```

## Verbose Output with -v

```bash
# Verbose output shows full query and response details
host -v -t AAAA example.com

# Example verbose output (TTL, ID, resolver, and addresses may vary):
# Trying "example.com"
# ;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 12345
# ;; ANSWER SECTION:
# example.com.  255  IN  AAAA  2606:4700:10::ac42:93f3
# example.com.  255  IN  AAAA  2606:4700:10::6814:179a
# Received 85 bytes from 127.0.0.53#53 in 0 ms
```

## Checking Multiple Domains

```bash
#!/bin/bash
# Check AAAA records for a list of domains
DOMAINS="example.com google.com github.com cloudflare.com ipv4only.example"

echo "Checking AAAA records..."
for DOMAIN in $DOMAINS; do
    RESULT=$(host -t AAAA $DOMAIN 2>&1)
    if echo "$RESULT" | grep -q "IPv6 address"; then
        ADDR=$(echo "$RESULT" | grep "IPv6 address" | head -1 | awk '{print $NF}')
        echo "OK:      $DOMAIN → $ADDR"
    elif echo "$RESULT" | grep -q "has no AAAA record"; then
        echo "NO AAAA: $DOMAIN"
    else
        echo "ERROR:   $DOMAIN - $RESULT"
    fi
done
```

## Checking SOA and NS Records for Reverse Zones

```bash
# Find the SOA for the reverse DNS zone of an IPv6 address
host -t SOA 8.b.d.0.1.0.0.2.ip6.arpa

# Find authoritative nameservers for a reverse zone
host -t NS 8.b.d.0.1.0.0.2.ip6.arpa
```

## host vs dig vs nslookup

| Feature | host | dig | nslookup |
|---|---|---|---|
| Simplicity | Highest | Moderate | Moderate |
| Output detail | Low | High | Moderate |
| Scripting | Good | Best | Harder |
| Windows | No | Needs install | Yes |
| IPv6 reverse | Auto-converts | With -x | Auto-converts |

## Summary

The `host` command provides clean, simple DNS lookups. Use `host -t AAAA <domain>` to check for IPv6 records, `host <ipv6-addr>` for reverse lookups (host auto-converts IPv6 addresses to the nibble-reversed ip6.arpa format), and `host -v` for verbose query details. It's best for quick checks and shell scripts where minimal output is preferred over dig's detailed information.
