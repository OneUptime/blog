# How to Configure nftables for IPv6 Firewalling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, nftables, Firewall, Linux, Security

Description: Learn how to configure nftables for IPv6 firewalling on Linux, including table and chain creation, IPv6-specific match syntax, and complete server firewall configurations.

## Overview

nftables is the modern replacement for ip6tables/iptables in Linux, available since kernel 3.13 and the default on most distributions since 2020. It provides a unified framework for IPv4 and IPv6 firewalling with a cleaner syntax, better performance, and atomic rule updates. nftables uses `nft` as its command-line tool and supports configuration files.

## nftables vs ip6tables

| Feature | ip6tables | nftables |
|---------|-----------|---------|
| IPv4 + IPv6 together | Separate commands | Single ruleset with `inet` family |
| Performance | One rule per operation | Multiple matches per rule |
| Atomic updates | Difficult | Native (`nft -f file` is atomic) |
| Default on Debian | Until Buster | Bullseye and later |
| Syntax | Verbose, separate options | Cleaner, expression-based |

## nftables Families

```text
ip    → IPv4 only
ip6   → IPv6 only
inet  → IPv4 and IPv6 (preferred for dual-stack)
arp   → ARP
bridge → Bridge frames
netdev → Ingress/egress per device
```

## Basic IPv6 nftables Setup

```bash
# Check nftables is running

systemctl status nftables

# List current ruleset
nft list ruleset

# Flush all (start fresh)
nft flush ruleset
```

## Complete IPv6 Firewall Configuration File

```bash
# /etc/nftables.d/ipv6-filter.nft

table ip6 filter {
    chain input {
        type filter hook input priority 0;
        policy drop;   # Default: drop all

        # Loopback
        iif lo accept

        # Established/related
        ct state established,related accept

        # Invalid - drop
        ct state invalid drop

        # Essential ICMPv6 - MUST allow
        ip6 nexthdr icmpv6 icmpv6 type destination-unreachable accept
        ip6 nexthdr icmpv6 icmpv6 type packet-too-big accept       # NEVER block
        ip6 nexthdr icmpv6 icmpv6 type time-exceeded accept
        ip6 nexthdr icmpv6 icmpv6 type parameter-problem accept

        # NDP - link-local only
        ip6 saddr fe80::/10 ip6 nexthdr icmpv6 icmpv6 type {
            nd-router-solicit,
            nd-router-advert,
            nd-neighbor-solicit,
            nd-neighbor-advert
        } accept

        # Echo (ping) with rate limit
        ip6 nexthdr icmpv6 icmpv6 type echo-request limit rate 10/second accept
        ip6 nexthdr icmpv6 icmpv6 type echo-reply accept

        # Block all other ICMPv6
        ip6 nexthdr icmpv6 drop

        # SSH from management network
        tcp dport 22 ip6 saddr fd00:abcd:1::/48 accept

        # Bogon sources
        ip6 saddr { ::/128, ::1/128, 2001:db8::/32 } drop

        # Web services
        tcp dport { 80, 443 } accept

        # Log remaining drops
        limit rate 5/minute log prefix "nftables-drop: "
    }

    chain forward {
        type filter hook forward priority 0;
        policy drop;

        ct state established,related accept
        ip6 nexthdr icmpv6 icmpv6 type packet-too-big accept
    }

    chain output {
        type filter hook output priority 0;
        policy accept;   # Allow all outbound

        # Anti-spoof: only our prefix as source
        # ip6 saddr != 2001:db8:corp::/48 drop  # Enable if needed
    }
}
```

```bash
# Apply the configuration
nft -f /etc/nftables.d/ipv6-filter.nft

# Or include in main nftables.conf:
# echo 'include "/etc/nftables.d/ipv6-filter.nft"' >> /etc/nftables.conf
```

## Useful nftables IPv6 Syntax

### Match IPv6 Header Fields

```bash
# Match by next header (protocol)
ip6 nexthdr tcp
ip6 nexthdr udp
ip6 nexthdr icmpv6
ip6 nexthdr { tcp, udp }
ip6 nexthdr 50   # ESP
ip6 nexthdr 51   # AH

# Match source/destination
ip6 saddr 2001:db8::/32
ip6 daddr 2001:db8:server::1/128

# Match by address set
ip6 saddr { 2001:db8:site1::/48, 2001:db8:site2::/48 }

# Match fragment header
exthdr frag exists    # Packet has fragment header
frag frag-off 0       # First fragment
```

### Rate Limiting in nftables

```bash
# Limit ping rate
ip6 nexthdr icmpv6 icmpv6 type echo-request limit rate 10/second burst 30 packets accept
ip6 nexthdr icmpv6 icmpv6 type echo-request drop

# Limit new TCP connections
tcp flags syn ct state new limit rate 100/second burst 500 packets accept
tcp flags syn ct state new drop
```

## Managing nftables

```bash
# Add a rule to existing chain
nft add rule ip6 filter input tcp dport 8443 accept

# Insert rule at position 1
nft insert rule ip6 filter input position 1 ip6 saddr ::/128 drop

# Delete a rule (need handle)
nft list ruleset -a | grep "dport 8443"
# Gets: table ip6 filter { chain input { ... handle 42 tcp dport 8443 accept ...
nft delete rule ip6 filter input handle 42

# List with handles
nft list table ip6 filter -a

# Make permanent
systemctl enable nftables
```

## Summary

nftables for IPv6 uses `table ip6 filter` with `chain input/forward/output`. Key syntax differences from ip6tables: use `ip6 nexthdr icmpv6 icmpv6 type` (not `--icmpv6-type`), combine multiple conditions in single rules with `{ }` sets, and use `ct state` for connection tracking. Load configuration files with `nft -f /etc/nftables.conf`. nftables is atomic - applying a configuration file either completely succeeds or completely fails, preventing partial rule application. Enable persistence with `systemctl enable nftables`.
