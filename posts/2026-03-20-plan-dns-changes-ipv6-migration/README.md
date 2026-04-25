# How to Plan DNS Changes for IPv6 Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, Migration, AAAA Records, DNSSEC

Description: Plan and execute DNS changes for IPv6 migration including adding AAAA records, PTR records for IPv6, recursive resolver updates, and validating dual-stack DNS behavior.

## Introduction

DNS is the critical enabler for IPv6 migration. Clients use AAAA records to discover IPv6 addresses, and recursive resolvers do not need IPv6 transport just to answer AAAA queries, but dual-stack resolvers avoid failures when clients or authoritative servers rely on different IP transports. DNS changes for IPv6 migration fall into three categories: adding AAAA records for services, configuring reverse DNS (PTR) for IPv6 addresses, and verifying resolver reachability over the transports your clients and upstream authorities require.

## Step 1: Inventory DNS Changes Required

```python
#!/usr/bin/env python3
# dns_migration_inventory.py
# Requires: pip install dnspython

import dns.resolver

# Services that need AAAA records
services = [
    "www.example.com",
    "api.example.com",
    "mail.example.com",
    "vpn.example.com",
    "internal.example.com",
]

print("DNS Migration Inventory")
print(f"{'Hostname':<35} {'Has A':>7} {'Has AAAA':>9} {'Action'}")
print("-" * 65)

for hostname in services:
    has_a = has_aaaa = False
    try:
        dns.resolver.resolve(hostname, 'A')
        has_a = True
    except:
        pass
    try:
        dns.resolver.resolve(hostname, 'AAAA')
        has_aaaa = True
    except:
        pass

    action = "Add AAAA" if has_a and not has_aaaa else ("OK" if has_aaaa else "Add A+AAAA")
    print(f"{hostname:<35} {'Yes' if has_a else 'No':>7} {'Yes' if has_aaaa else 'No':>9}  {action}")
```

## Step 2: Add AAAA Records

```bash
# BIND zone file additions
# /etc/bind/zones/example.com.zone

$TTL 300

; Existing A records (keep these)
www     IN  A     203.0.113.1
api     IN  A     203.0.113.2
mail    IN  A     203.0.113.3

; Add AAAA records for IPv6
www     IN  AAAA  2001:db8:1::1
api     IN  AAAA  2001:db8:1::2
mail    IN  AAAA  2001:db8:1::3

; MX record - mail server should have reachable address records (A and/or AAAA)
@       IN  MX 10 mail.example.com.
```

```bash
# Verify records after publishing
dig AAAA www.example.com +short
dig A    www.example.com +short

# Test dual-stack resolution
host www.example.com
# Should show both A and AAAA answers
```

## Step 3: Reverse DNS (PTR) for IPv6

IPv6 PTR records use the `ip6.arpa` zone with a reversed, nibble-separated address:

```python
#!/usr/bin/env python3
# generate_ptr_records.py
import ipaddress

def ipv6_to_ptr(addr: str) -> str:
    """Convert an IPv6 address to its ip6.arpa reverse DNS name."""
    ip = ipaddress.ip_address(addr)
    # Full 32-character hex with no colons
    full_hex = ip.exploded.replace(':', '')
    # Reverse and join with dots
    return '.'.join(reversed(full_hex)) + '.ip6.arpa.'

addresses = {
    "2001:db8:1::1": "www.example.com.",
    "2001:db8:1::2": "api.example.com.",
    "2001:db8:1::3": "mail.example.com.",
}

print("; IPv6 PTR records for ip6.arpa zone")
for addr, hostname in addresses.items():
    ptr_name = ipv6_to_ptr(addr)
    print(f"{ptr_name} IN PTR {hostname}")
```

Example output:
```text
; IPv6 PTR records for ip6.arpa zone
1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.1.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa. IN PTR www.example.com.
```

## Step 4: Update Recursive Resolvers

Recursive resolvers do not need IPv6 transport just to answer AAAA queries, but dual-stack resolvers avoid reachability problems when clients, authoritative servers, or forwarders rely on different IP transports.

```bash
# /etc/bind/named.conf - explicit IPv6 listener settings for a resolver
# BIND already listens on all IPv6 interfaces by default if listen-on-v6 is omitted.

options {
    listen-on-v6 { any; };      # Explicitly listen on all IPv6 interfaces
    listen-on    { any; };      # Keep IPv4 too

    # Allow queries from IPv6 clients
    allow-query { any; };

    # Optional: forward to upstream resolvers over IPv6 and IPv4
    forwarders {
        2001:4860:4860::8888;   # Google IPv6 DNS
        2001:4860:4860::8844;
        8.8.8.8;                # Optional IPv4 upstream
    };
};
```

## Step 5: DNS Record Rollout Strategy

Use low TTL during migration to enable fast rollback:

```bash
# 1. Lower TTL well before migration (24 hours before)
#    Change: $TTL 86400 -> $TTL 60
# 2. Publish AAAA record
# 3. Monitor for 30 minutes - check logs, error rates
# 4. If issues: remove AAAA record (most clients refresh once caches using the lowered TTL expire)
# 5. If successful after 2 hours: increase TTL back to 300-3600

# Verify clients are using IPv6
dig AAAA www.example.com @2001:db8::53 +short
# Monitor access logs for IPv6 requests
tail -f /var/log/nginx/access.log | grep --line-buffered -E '^[0-9a-fA-F:]{3,39} '
```

## Step 6: DNSSEC for IPv6 Zones

DNSSEC works identically for AAAA records as for A records - no IPv6-specific DNSSEC configuration is needed beyond standard DNSSEC deployment:

```bash
# Sign zone with DNSSEC (BIND)
dnssec-keygen -a ECDSAP384SHA384 -n ZONE example.com
dnssec-signzone -S -o example.com example.com.zone
# Publish the resulting DS record at the parent zone to complete the chain of trust
```

## Conclusion

DNS changes for IPv6 migration follow a three-step pattern: add AAAA records for services, configure PTR records in the `ip6.arpa` delegation, and verify recursive resolvers can serve the clients and upstream authorities they need to reach over IPv4 and/or IPv6. Use a 60-second TTL during AAAA record publication to shorten rollback time if issues arise. The IPv6 PTR record format requires generating nibble-reversed addresses under `ip6.arpa` - use a script to generate these accurately rather than manually constructing the format.
