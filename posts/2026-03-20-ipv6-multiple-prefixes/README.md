# How to Manage Multiple IPv6 Prefixes on a Host

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Multiple Prefixes, SLAAC, Address Management, Network Configuration

Description: Configure and manage hosts that receive multiple IPv6 prefixes via SLAAC or static assignment, including address deprecation, prefix lifetimes, and routing.

## Introduction

A single IPv6 host can have multiple global addresses from different prefixes - either from multiple Router Advertisements, manual assignment, or both SLAAC and DHCPv6. Managing multiple prefixes requires understanding address lifetimes, default route selection, and how applications choose which source address to use.

## Viewing Multiple Prefix Assignments

```bash
# Show all IPv6 addresses with full details

ip -6 addr show scope global

# Show with lifetime information
ip -6 addr show scope global | grep -A3 "inet6"

# Example output with multiple prefixes:
# inet6 2001:db8:a::100/64 scope global dynamic mngtmpaddr
#    valid_lft 86399sec preferred_lft 14399sec
# inet6 2001:db8:b::100/64 scope global dynamic mngtmpaddr
#    valid_lft 86399sec preferred_lft 14399sec
# inet6 fd12:3456:789a::100/64 scope global  ← manual/ULA
```

## Understanding Address Lifetimes

```bash
# SLAAC addresses have two lifetimes from the RA prefix option:
# valid_lft  - address can be used (preferred or deprecated)
# preferred_lft - address is preferred for new connections

# When preferred_lft expires, address becomes "deprecated"
# New connections avoid deprecated addresses
# Existing connections using deprecated addresses continue

# Monitor address lifetime events
journalctl -f | grep "ipv6\|inet6\|prefix"

# Check remaining lifetime
ip -6 addr show scope global | grep "valid_lft\|preferred_lft"
```

## Handling Multiple RAs with Different Prefixes

```bash
# Multiple routers or prefixes on the same link
# Each autonomous RA prefix can add a new SLAAC address

# Check how many RAs are being received
sudo tcpdump -i eth0 -v "ip6 proto 58 and ip6[40] == 134" 2>/dev/null &
sleep 30
sudo pkill tcpdump

# Disable a specific prefix from being used
# (Can't selectively ignore a prefix from RA; must manage at RA source)

# To stop accepting new prefixes from a specific router,
# you'd need ip6tables rules to block the specific RA:
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 134 \
    -s fe80::bad-router -j DROP
```

## Configuring Static Multiple Addresses

```bash
# Add multiple IPv6 addresses to an interface
sudo ip -6 addr add 2001:db8:a::100/64 dev eth0
sudo ip -6 addr add 2001:db8:b::100/64 dev eth0
sudo ip -6 addr add fd12:3456:789a::100/64 dev eth0

# Linux adds on-link prefix routes automatically unless noprefixroute is used
ip -6 route show | grep eth0

# Only add routes manually if automatic prefix routes were disabled
# sudo ip -6 route add 2001:db8:a::/64 dev eth0 src 2001:db8:a::100
# sudo ip -6 route add 2001:db8:b::/64 dev eth0 src 2001:db8:b::100

# Verify
ip -6 addr show dev eth0
ip -6 route show dev eth0
```

## Persistent Configuration with systemd-networkd

```ini
# /etc/systemd/network/eth0.network

[Match]
Name=eth0

[Network]
IPv6AcceptRA=yes

# Static additional addresses
Address=2001:db8:a::100/64
Address=2001:db8:b::100/64
Address=fd12:3456:789a::100/64

# Disable temporary privacy addresses for stable source selection
IPv6PrivacyExtensions=no
```

## Managing Prefix Deprecation

```bash
# Deprecate an address (mark it as no longer preferred)
# New connections won't use it, existing ones continue
sudo ip -6 addr change 2001:db8:old::100/64 dev eth0 \
    preferred_lft 0 valid_lft 3600

# Remove an expired or unwanted address
sudo ip -6 addr del 2001:db8:old::100/64 dev eth0

# Script to clean up deprecated addresses
ip -6 addr show scope global | \
    awk '/preferred_lft 0/{print prev} {prev=$0}' | \
    grep "inet6" | awk '{print $2}' | while read addr; do
    echo "Removing deprecated: $addr"
    # sudo ip -6 addr del $addr dev eth0
done
```

## Verification Script

```bash
#!/bin/bash
# show-ipv6-prefixes.sh

echo "=== IPv6 Prefix Summary ==="

echo ""
echo "Active global addresses and their lifetimes:"
ip -6 addr show scope global | while IFS= read -r line; do
    if echo "$line" | grep -q "inet6"; then
        addr=$(echo "$line" | awk '{print $2}')
        echo ""
        echo "  Address: $addr"
    elif echo "$line" | grep -q "valid_lft"; then
        valid=$(echo "$line" | grep -o "valid_lft [^ ]*" | cut -d' ' -f2)
        preferred=$(echo "$line" | grep -o "preferred_lft [^ ]*" | cut -d' ' -f2)
        echo "    Valid: $valid  Preferred: $preferred"
        [ "$preferred" = "0sec" ] && echo "    STATUS: DEPRECATED"
    fi
done

echo ""
echo "Routes per prefix:"
ip -6 route show scope link dev eth0 2>/dev/null
```

## Conclusion

Multiple IPv6 prefixes on a single host are common and expected in enterprise and multi-homed environments. Monitor addresses with `ip -6 addr show scope global` which shows lifetimes - preferred_lft=0 means deprecated. SLAAC automatically manages address lifetimes from RA prefix options. For static configurations, add all desired addresses with `ip -6 addr add` and corresponding on-link routes are added automatically unless `noprefixroute` is used. Ensure source address selection (RFC 6724) picks the correct address for each destination to avoid asymmetric routing.
