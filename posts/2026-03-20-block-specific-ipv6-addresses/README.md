# How to Block Specific IPv6 Addresses and Prefixes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ip6tables, nftables, Blocking, Security

Description: Learn how to block specific IPv6 addresses and prefixes using ip6tables and nftables, including dynamic blocklists, IPv6 sets, and automated blocking from logs.

## Overview

Blocking specific IPv6 addresses and prefixes is a common security task - blocking scanners, attackers, or unwanted traffic from specific ASNs or known bad actors. IPv6 addresses are 128 bits, making manual management impractical at scale. This guide covers both static and dynamic blocking with ip6tables and nftables sets.

## ip6tables: Static Block Rules

```bash
# Block a single IPv6 address

ip6tables -A INPUT -s 2001:db8:dead:beef::1 -j DROP

# Block a /48 prefix
ip6tables -A INPUT -s 2001:db8:bad::/48 -j DROP

# Block outbound to a specific destination
ip6tables -A OUTPUT -d 2001:db8:cafe::1 -j DROP

# Block with logging
ip6tables -A INPUT -s 2001:db8:bad::/48 \
  -m limit --limit 1/minute \
  -j LOG --log-prefix "BLOCKED-IPV6: "
ip6tables -A INPUT -s 2001:db8:bad::/48 -j DROP
```

## ip6tables: ipset for Large Blocklists

Using ipset with ip6tables is efficient for large blocklists:

```bash
# Install ipset
apt install ipset

# Create an IPv6 hash set
ipset create ipv6-blocklist hash:net family inet6

# Add prefixes to the set
ipset add ipv6-blocklist 2001:db8:bad1::/48
ipset add ipv6-blocklist 2001:db8:b200::/40
ipset add ipv6-blocklist 2001:db8:dead:beef::1/128

# Use with ip6tables
ip6tables -A INPUT -m set --match-set ipv6-blocklist src -j DROP

# Save ipset to file
ipset save ipv6-blocklist > /etc/ipset-ipv6-blocklist.conf

# Restore on boot
# Add to systemd service or /etc/rc.local:
ipset restore < /etc/ipset-ipv6-blocklist.conf

# Remove from set
ipset del ipv6-blocklist 2001:db8:bad1::/48

# Flush (remove all entries)
ipset flush ipv6-blocklist
```

## nftables: Named Sets for Blocklists

nftables sets are more efficient and natively integrated:

```bash
# Static set (compiled at ruleset load time)
table ip6 blocklist {
    set bad_addrs {
        type ipv6_addr
        flags interval        # Allow CIDR prefixes
        elements = {
            2001:db8:bad1::/48,
            2001:db8:b200::/40,
            2001:db8:dead:beef::1/128
        }
    }

    chain input {
        type filter hook input priority -100;   # Check before main filter
        ip6 saddr @bad_addrs \
            log prefix "BLOCKLIST-DROP: " level warn drop
    }
}
```

```bash
# Apply
nft -f /etc/nftables.d/blocklist.nft

# Add to set at runtime
nft add element ip6 blocklist bad_addrs { 2001:db8:bead::/48 }

# Remove from set
nft delete element ip6 blocklist bad_addrs { 2001:db8:bad1::/48 }

# List current set contents
nft list set ip6 blocklist bad_addrs
```

## nftables: Dynamic Blocklist with Timeout

```bash
# Dynamic set: entries auto-expire after timeout
table ip6 dynamic_block {
    set temp_block {
        type ipv6_addr
        flags dynamic, timeout
        timeout 1h            # Auto-expire entries after 1 hour
        size 65535            # Max 65535 entries
    }

    chain input {
        type filter hook input priority -100;
        ip6 saddr @temp_block drop   # Drop if in blocklist
    }
}

# Add address to temporary block
nft add element ip6 dynamic_block temp_block { 2001:db8:feed::1 }

# View current dynamic blocks
nft list set ip6 dynamic_block temp_block
```

## Automated Blocking from Logs

```bash
#!/bin/bash
# auto-block-ipv6.sh - Parse logs and auto-block attackers

THRESHOLD=10      # Block after 10 failed attempts
WINDOW=300        # In 300 seconds (5 minutes)
BLOCK_TIME="1h"   # Block for 1 hour

# Parse journald for SSH failures (IPv6 addresses)
journalctl -u ssh --since "$WINDOW seconds ago" | \
  grep "Failed password" | \
  grep -oP 'from \K(?=[0-9A-Fa-f:]*:)[0-9A-Fa-f:]+' | \
  sort | uniq -c | \
  awk -v t="$THRESHOLD" '$1 >= t {print $2}' | \
  while read ip; do
    echo "Auto-blocking: $ip"
    nft add element ip6 dynamic_block temp_block { $ip timeout $BLOCK_TIME }
  done
```

## Block By ASN (BGP Prefix)

For blocking entire autonomous systems or ISPs:

```bash
# Get IPv6 prefixes for an ASN using BGP data
# Example: Block ASN 12345
# First, get their IPv6 prefixes from a BGP looking glass or RIPE

# Then add to blocklist
PREFIXES=("2001:db8:1000::/36" "2001:db8:1234::/48")
for PREFIX in "${PREFIXES[@]}"; do
    nft add element ip6 blocklist bad_addrs { "$PREFIX" }
done
```

## Geolocation-Based Blocking

```bash
# Using maxmind or ip2location databases with ipset
# Example: Block all IPv6 from specific country using ipset
# (Requires GeoIP database)

ipset create country-block hash:net family inet6

# Get country's IPv6 prefixes from GeoIP database
# (Use tools like geoipupdate + aggregate-prefixes)

# Import country prefixes
while read PREFIX; do
    ipset add country-block "$PREFIX"
done < /tmp/country-ipv6-prefixes.txt

ip6tables -A INPUT -m set --match-set country-block src -j DROP
```

## Checking What's Currently Blocked

```bash
# List all ip6tables DROP rules
ip6tables -L INPUT -n | grep DROP

# List nftables blocklist
nft list set ip6 blocklist bad_addrs

# Check if specific address is in nftables set
nft get element ip6 blocklist bad_addrs { 2001:db8:dead:beef::1 }

# View ipset
ipset list ipv6-blocklist
```

## Summary

Block specific IPv6 addresses with `ip6tables -A INPUT -s <prefix> -j DROP` for static rules. For large blocklists, use ipset (`ipset create ipv6-blocklist hash:net family inet6`) with ip6tables, or nftables named sets with `type ipv6_addr flags interval`. For dynamic blocking (auto-expiring), use nftables sets with `flags dynamic, timeout` and `timeout 1h`. Automate blocking by parsing SSH auth logs for repeated failures and adding to the dynamic set. Always log blocked addresses for audit - `log prefix "BLOCKLIST: " level warn` before the drop.
