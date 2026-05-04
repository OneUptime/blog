# How to Configure IPv6 Firewall Rules with ipfw on FreeBSD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, FreeBSD, Ipfw, Firewall, Network Security

Description: Learn how to configure IPv6 firewall rules using ipfw on FreeBSD, including essential ICMPv6 rules, allowing services, and blocking traffic.

## Enable ipfw on FreeBSD

```bash
# Enable ipfw in /etc/rc.conf

cat >> /etc/rc.conf << 'EOF'
firewall_enable="YES"
firewall_type="workstation"   # or "open", "client", "simple", "filename"
firewall_script="/etc/ipfw.rules"
EOF

# Or enable manually with kernel module
kldload ipfw
```

## Basic ipfw IPv6 Rules Script

```bash
# /etc/ipfw.rules - basic IPv6 and IPv4 rules

#!/bin/sh
ipfw -q -f flush

# Allow loopback
ipfw -q add allow all from any to any via lo0

# ===== Essential IPv6 ICMPv6 Rules =====
# Must allow NDP and key ICMPv6 messages

# Allow Neighbor Solicitation/Advertisement (NDP - replaces ARP)
ipfw -q add allow ipv6-icmp from any to any ip6icmptype 135,136

# Allow Router Solicitation/Advertisement (SLAAC)
ipfw -q add allow ipv6-icmp from any to any ip6icmptype 133,134

# Allow ICMPv6 ping6
ipfw -q add allow ipv6-icmp from any to any ip6icmptype 128,129

# Allow Packet Too Big (required for PMTUD)
ipfw -q add allow ipv6-icmp from any to any ip6icmptype 2

# Allow other critical ICMPv6
ipfw -q add allow ipv6-icmp from any to any ip6icmptype 1,3,4

# ===== IPv6 Service Rules =====

# Allow SSH over IPv6
ipfw -q add allow tcp from any to me6 22 in

# Allow HTTPS over IPv6
ipfw -q add allow tcp from any to me6 443 in

# Allow established connections
ipfw -q add allow tcp from any to any established

# ===== Default deny =====
ipfw -q add deny all from any to any
```

## Working with IPv6 Addresses in ipfw

```bash
# Allow from a specific IPv6 address
ipfw add allow all from 2001:db8::1 to me6

# Allow from an IPv6 subnet
ipfw add allow all from 2001:db8::/32 to me6

# Block a specific IPv6 host
ipfw add deny all from 2001:db8::dead:beef to any

# Allow outbound IPv6 only
ipfw add allow ip6 from me6 to any out via em0

# Block all IPv6 on an interface
ipfw add deny ip6 from any to any via em1
```

## View and Manage ipfw Rules

```bash
# List all rules with rule numbers
ipfw list

# List only IPv6 rules
ipfw list | grep ipv6

# Delete a rule by number
ipfw delete 100

# Flush all rules
ipfw -f flush

# Show statistics (packet/byte counts)
ipfw -a list

# Reset counters
ipfw zero
```

## Dynamic Rules

```bash
# Allow established TCP with state tracking
ipfw add check-state

# Allow outgoing connections and track state
ipfw add allow tcp from me6 to any setup keep-state

# Allow UDP outgoing with state
ipfw add allow udp from me6 to any keep-state
```

## ipfw vs pf for IPv6

| Feature | ipfw | pf |
|---------|------|----|
| Syntax | Procedural, numbered rules | Declarative, last-match |
| State tracking | keep-state | keep state |
| IPv6 keyword | `ip6`, `ipv6-icmp` | `inet6` |
| ICMPv6 type | `ip6icmptype <N>` | `icmp6-type <name>` |
| Default policy | First-match, explicit deny | block all + pass |

## Summary

Configure IPv6 firewall rules with ipfw using the `ip6` keyword and `ipv6-icmp` protocol. Always allow essential ICMPv6 types 1, 2, 3, 4 (error types), 128, 129 (ping6), 133, 134 (RA/RS), 135, 136 (NDP). Specify IPv6 addresses directly in rules. Enable ipfw at boot with `firewall_enable="YES"` and `firewall_script="/path/to/rules"` in `/etc/rc.conf`. View rules with `ipfw list`, flush with `ipfw -f flush`.
