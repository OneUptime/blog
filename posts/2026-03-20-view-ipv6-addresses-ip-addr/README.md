# How to View IPv6 Addresses with ip -6 addr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, ip command, Network Diagnostics, Address Management

Description: A guide to using the `ip -6 addr` command to view, filter, and interpret IPv6 address information on Linux systems.

## Basic IPv6 Address Display

```bash
# Show all IPv6 addresses on all interfaces

ip -6 addr show

# Short form (same result)
ip -6 addr

# Show IPv6 addresses for a specific interface
ip -6 addr show dev eth0

# Show in a more concise format
ip -6 addr show | grep 'inet6'
```

## Understanding ip -6 addr Output

```bash
$ ip -6 addr show dev eth0

3: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default
    inet6 2001:db8::10/64 scope global
       valid_lft forever preferred_lft forever
    inet6 fe80::1234:5678:9abc:def0/64 scope link
       valid_lft forever preferred_lft forever
```

Explanation:
- `2001:db8::10/64 scope global` - Routable, globally unique IPv6 address
- `fe80::...` - Link-local address (always present on active IPv6 interfaces)
- `valid_lft forever` - Address is permanently valid (static)
- `preferred_lft forever` - Address is preferred for new connections

## Filtering by Scope

```bash
# Show only global (routable) IPv6 addresses
ip -6 addr show dev eth0 scope global

# Show only link-local addresses
ip -6 addr show dev eth0 scope link

# Show only site-local addresses (deprecated but still seen)
ip -6 addr show scope site

# Show only host-scoped addresses (loopback)
ip -6 addr show scope host
```

## Understanding Address Lifetimes

IPv6 addresses (especially SLAAC addresses) have time limits:

```bash
# SLAAC temporary address with finite lifetime
inet6 2001:db8::9a37:bcff:fe12:3456/64 scope global temporary dynamic
   valid_lft 86389sec preferred_lft 14389sec

# Static address (permanent)
inet6 2001:db8::10/64 scope global
   valid_lft forever preferred_lft forever

# Deprecated address (preferred_lft expired, but still valid for existing connections)
inet6 2001:db8::dead/64 scope global deprecated dynamic
   valid_lft 3600sec preferred_lft 0sec
```

## Filtering by Address Type

```bash
# Show only dynamic (SLAAC or DHCPv6) addresses
ip -6 addr show dynamic

# Show only permanent (static) addresses
ip -6 addr show permanent

# Show deprecated addresses
ip -6 addr show deprecated

# Show tentative addresses (DAD in progress)
ip -6 addr show tentative
```

## Showing All Interface Addresses

```bash
# Show all addresses (IPv4 and IPv6) together
ip addr show

# Show IPv6 only, all interfaces, in JSON format
ip -j -6 addr show | python3 -m json.tool

# Extract just the IPv6 addresses
ip -6 addr show | grep 'inet6' | awk '{print $2}'
```

## Monitoring Address Changes

```bash
# Monitor IPv6 address changes in real time
ip -6 monitor addr

# Watch address table update
watch -n 1 'ip -6 addr show'

# Show only non-link-local global addresses (useful overview)
ip -6 addr show | grep 'scope global' | grep -v 'fe80'
```

## Script: Get Primary IPv6 Address

```bash
#!/bin/bash
# Get the primary global IPv6 address of an interface
get_ipv6() {
    local IFACE=${1:-eth0}
    ip -6 addr show dev "$IFACE" scope global | \
        grep 'inet6' | \
        grep -v 'temporary\|deprecated\|tentative' | \
        head -1 | \
        awk '{print $2}' | \
        cut -d'/' -f1
}

echo "Primary IPv6 address on eth0: $(get_ipv6 eth0)"
```

## Checking for Duplicate Address Detection (DAD)

When a new IPv6 address is assigned, the kernel performs DAD. During this time, the address is "tentative":

```bash
# Assign a new address
ip -6 addr add 2001:db8::abcd/64 dev eth0

# Check if it's in tentative state (DAD in progress)
ip -6 addr show dev eth0 tentative
# If empty: DAD complete, address is active

# Check DAD results in kernel log
dmesg | grep -E 'duplicate|DAD' | tail -5
```

## Summary

Use `ip -6 addr show` to view all IPv6 addresses, `ip -6 addr show dev <iface>` for specific interfaces, and filter by scope (`scope global`, `scope link`) or state (`dynamic`, `permanent`, `deprecated`, `tentative`). The output includes address/prefix, scope, and lifetime information (SLAAC addresses have finite `valid_lft` and `preferred_lft`, while static addresses show `forever`).
