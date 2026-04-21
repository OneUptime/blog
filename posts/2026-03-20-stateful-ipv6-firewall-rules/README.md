# How to Configure Stateful IPv6 Firewall Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Firewall, Stateful, Conntrack, nftables

Description: Learn how to implement stateful IPv6 firewall rules using connection tracking to allow established connections while blocking new unauthorized connections.

## Overview

Stateful firewalling tracks the state of each connection and allows packets that belong to established, legitimate connections while blocking unsolicited inbound traffic. For IPv6, connection tracking (conntrack) operates the same way as IPv4, tracking TCP state, UDP sessions, and ICMPv6 conversations. Stateful rules are the foundation of secure IPv6 firewall design.

## Connection States

| State | Meaning |
|-------|---------|
| NEW | Packet for a connection that has not seen traffic in both directions yet |
| ESTABLISHED | Packet for a connection that has seen traffic in both directions |
| RELATED | Related to an established connection (e.g., ICMP error for TCP) |
| INVALID | Packet that doesn't fit any known connection |
| UNTRACKED | Packet marked to bypass conntrack |

## ip6tables Stateful Rules

```bash
# Basic stateful INPUT policy:

# 1. Allow loopback

ip6tables -A INPUT -i lo -j ACCEPT

# 2. Drop invalid packets (malformed, out of state)
ip6tables -A INPUT -m conntrack --ctstate INVALID -j DROP

# 3. Allow established and related (the key stateful rule)
ip6tables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# 4. Allow essential ICMPv6 (errors and Neighbor Discovery)
ip6tables -A INPUT -p icmpv6 --icmpv6-type destination-unreachable -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type time-exceeded -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type parameter-problem -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type router-solicitation -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type router-advertisement -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-solicitation -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-advertisement -j ACCEPT

# 5. Allow new connections only to specific services
ip6tables -A INPUT -m conntrack --ctstate NEW -p tcp --dport 22 -j ACCEPT
ip6tables -A INPUT -m conntrack --ctstate NEW -p tcp --dport 443 -j ACCEPT

# 6. Drop everything else (new connections to unlisted services)
ip6tables -A INPUT -j DROP
```

The key insight: rule 3 allows ALL return traffic for connections you initiated (ESTABLISHED), so you don't need to explicitly allow return packets for each outbound connection.

## nftables Stateful Rules

```bash
table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        iif lo accept

        # Connection tracking - the stateful core
        ct state invalid drop
        ct state established,related accept

        # NEW connections - only to authorized services
        ct state new tcp dport 22 accept
        ct state new tcp dport { 80, 443 } accept

        # ICMPv6 essential (NEW and ESTABLISHED/RELATED)
        icmpv6 type packet-too-big accept
        icmpv6 type { destination-unreachable, time-exceeded, parameter-problem } accept
        icmpv6 type { nd-neighbor-solicit, nd-neighbor-advert, nd-router-solicit, nd-router-advert } accept
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}
```

## Stateful Firewall for a Router/Gateway

```bash
# For a router forwarding traffic between networks:

table inet forward-filter {
    chain forward {
        type filter hook forward priority 0; policy drop;

        # Allow established forwarded connections
        ct state established,related accept
        ct state invalid drop

        # Allow new connections from internal → external
        iifname "eth1" oifname "eth0" ct state new accept  # LAN → WAN

        # Allow Packet Too Big to pass (required for PMTUD through router)
        icmpv6 type packet-too-big accept

        # Block new connections from external → internal (default deny)
        # iifname "eth0" oifname "eth1" ct state new drop  ← implicit from policy drop
    }
}
```

## Stateful ICMPv6 Tracking

ICMPv6 is partially connection-tracked:

```bash
# Echo request/reply - conntrack tracks the request/reply pair
ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request -m conntrack --ctstate NEW -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-reply -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Error messages (Packet Too Big, Unreachable) - RELATED to the triggering flow
ip6tables -A INPUT -p icmpv6 --icmpv6-type packet-too-big -m conntrack --ctstate RELATED -j ACCEPT
```

## Inspecting Conntrack State

```bash
# View current connection tracking table
conntrack -L -f ipv6

# Sample output:
# tcp      6  431996  ESTABLISHED src=2001:db8:1::1 dst=2001:db8:2::1 sport=54321 dport=443
#                               src=2001:db8:2::1 dst=2001:db8:1::1 sport=443 dport=54321 [ASSURED] mark=0

# Count connections by state
conntrack -L -f ipv6 2>/dev/null | awk '{print $4}' | sort | uniq -c

# Filter by source
conntrack -L -f ipv6 --orig-src 2001:db8:1::1

# Monitor new connections in real time
conntrack -E -f ipv6 -e NEW
```

## Conntrack Tuning for IPv6

```bash
# Increase conntrack table size for high-traffic servers
sysctl net.netfilter.nf_conntrack_max
sysctl -w net.netfilter.nf_conntrack_max=1000000

# Reduce TCP established timeout (default 432000s = 5 days)
sysctl -w net.netfilter.nf_conntrack_tcp_timeout_established=3600

# Persistent
echo "net.netfilter.nf_conntrack_max = 1000000" >> /etc/sysctl.d/99-conntrack.conf
echo "net.netfilter.nf_conntrack_tcp_timeout_established = 3600" >> /etc/sysctl.d/99-conntrack.conf
```

## Summary

Stateful IPv6 firewalls use conntrack to track connection state (NEW, ESTABLISHED, RELATED, INVALID). The core rules are: `ct state invalid drop` (malformed/out-of-state packets), `ct state established,related accept` (return traffic for existing connections), and `ct state new <service> accept` (explicit allowlist for new connections). This pattern means you only need rules for new inbound connections - all return traffic is automatically allowed. Use `conntrack -L -f ipv6` to inspect the current state table and `conntrack -E -f ipv6 -e NEW` to monitor new IPv6 connections in real time.
