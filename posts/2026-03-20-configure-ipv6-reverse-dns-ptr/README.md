# How to Configure IPv6 Reverse DNS (PTR Records in ip6.arpa)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, PTR Records, Reverse DNS, Ip6.arpa

Description: A step-by-step guide to setting up IPv6 reverse DNS PTR records in the ip6.arpa zone, enabling hostname lookups from IPv6 addresses.

## What Is IPv6 Reverse DNS?

Reverse DNS (rDNS) maps IP addresses back to hostnames. For IPv6, this uses the `ip6.arpa` domain. Unlike IPv4 which uses dotted-decimal octets in `in-addr.arpa`, IPv6 uses individual hexadecimal nibbles in reversed order in `ip6.arpa`.

## How IPv6 Reverse DNS Works

For the IPv6 address `2001:db8::1` (expanded: `2001:0db8:0000:0000:0000:0000:0000:0001`):

1. Expand to full 32 hex digits: `20010db8000000000000000000000001`
2. Separate into nibbles: `2 0 0 1 0 d b 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1`
3. Reverse the order: `1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 8 b d 0 1 0 0 2`
4. Join with dots: `1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa.`

This long nibble-reversed format is the PTR record name.

## Creating the ip6.arpa Zone in BIND

For the prefix `2001:db8::/32`, create a reverse zone for `8.b.d.0.1.0.0.2.ip6.arpa`:

```named
// /etc/named.conf - add the reverse zone

zone "8.b.d.0.1.0.0.2.ip6.arpa" {
    type master;
    file "/var/named/2001-db8.rev";
    allow-update { none; };
};
```

## Creating the Reverse Zone File

```dns
; /var/named/2001-db8.rev
; Reverse zone for 2001:db8::/32

$TTL 3600

@ IN SOA ns1.example.com. admin.example.com. (
    2026032001  ; Serial
    3600        ; Refresh
    900         ; Retry
    604800      ; Expire
    300 )       ; Minimum TTL

@ IN NS ns1.example.com.
@ IN NS ns2.example.com.

; PTR records for 2001:db8::1 through 2001:db8::5
; Full reversed nibble address relative to the zone origin:
; 2001:db8::1 = 1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0
1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0   IN PTR server1.example.com.
2.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0   IN PTR server2.example.com.
3.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0   IN PTR server3.example.com.

; PTR for 2001:db8::100
0.0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0   IN PTR gateway.example.com.
```

## Generating PTR Record Names

Computing nibble-reversed names manually is error-prone. Use this script:

```bash
#!/bin/bash
# Generate PTR record name from IPv6 address

# Usage: ipv6-ptr.sh 2001:db8::1

ipv6_to_ptr() {
    local addr=$1
    # Use Python to expand and reverse the address
    python3 -c "
import ipaddress
addr = ipaddress.ip_address('$addr')
# Get full hex without colons
full = addr.exploded.replace(':', '')
# Reverse nibble by nibble and join with dots
ptr = '.'.join(reversed(full)) + '.ip6.arpa.'
print(ptr)
"
}

ipv6_to_ptr "$1"
```

```bash
# Example usage
./ipv6-ptr.sh 2001:db8::1
# Output: 1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa.

./ipv6-ptr.sh 2001:db8:cafe::1
# Output: 1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa.
```

## Reloading BIND and Testing

```bash
# Check zone file syntax
named-checkzone "8.b.d.0.1.0.0.2.ip6.arpa" /var/named/2001-db8.rev

# Reload BIND
rndc reload

# Test reverse lookup
dig -x 2001:db8::1 @127.0.0.1
# Expected: 1.0.0.0...8.b.d.0.1.0.0.2.ip6.arpa. 3600 IN PTR server1.example.com.

# Test using host command
host 2001:db8::1 127.0.0.1
```

## Adding PTR with nsupdate (Dynamic DNS)

```bash
# Add a PTR record dynamically
nsupdate << 'EOF'
server 127.0.0.1
zone 8.b.d.0.1.0.0.2.ip6.arpa.
update add 1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa. 3600 PTR server1.example.com.
send
EOF
```

## Summary

IPv6 reverse DNS PTR records live in the `ip6.arpa` zone using a nibble-reversed address format. To set up rDNS: expand the IPv6 address to full 32 hex digits, reverse nibble by nibble, add `.ip6.arpa.`, create a BIND zone for the appropriate prefix, and add PTR records. Use Python or a script to automate the nibble-reversal calculation.
