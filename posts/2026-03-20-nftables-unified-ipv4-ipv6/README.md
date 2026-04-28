# How to Write Unified IPv4/IPv6 Firewall Rules with nftables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv4, nftables, Dual-Stack, Firewall

Description: Learn how to write unified firewall rules for both IPv4 and IPv6 using nftables inet family, avoiding the need to maintain separate iptables and ip6tables rulesets.

## Overview

nftables `inet` family allows writing a single ruleset that applies to both IPv4 and IPv6. This eliminates the maintenance burden of keeping iptables and ip6tables rules synchronized. Using `inet` tables, you write one rule that covers both protocol versions - significantly reducing configuration complexity and the risk of asymmetric policies.

## inet Family vs ip + ip6

```bash
# Without inet: Two separate tables

table ip filter { ... }    # IPv4 only
table ip6 filter { ... }   # IPv6 only

# With inet: One table for both
table inet filter { ... }  # IPv4 AND IPv6
```

## Complete Unified Dual-Stack Firewall

```bash
#!/usr/sbin/nft -f
# /etc/nftables.conf - Unified IPv4/IPv6 firewall

# Flush existing ruleset
flush ruleset

table inet filter {

    # ==================================================
    # Set definitions (reusable address groups)
    # ==================================================

    set MGMT_NETS {
        type ipv6_addr
        flags interval
        elements = { fd12:3456:789a::/48, 2001:db8:1::/64 }
    }

    set MGMT_NETS4 {
        type ipv4_addr
        flags interval
        elements = { 10.0.0.0/8, 192.168.0.0/16 }
    }

    set BOGON6 {
        type ipv6_addr
        flags interval
        elements = {
            ::/128,
            ::1/128,
            2001:db8::/32,
            fc00::/7
        }
    }

    # ==================================================
    # Input chain
    # ==================================================

    chain input {
        type filter hook input priority 0;
        policy drop;

        # Loopback
        iif lo accept

        # Established/related
        ct state established,related accept
        ct state invalid drop

        # ==== ICMPv4 (ping, error reporting) ====
        ip protocol icmp icmp type { echo-request, echo-reply, destination-unreachable, time-exceeded, parameter-problem } accept

        # ==== ICMPv6 - critical (BOTH protocols) ====
        # Packet Too Big - NEVER block (applies only to IPv6)
        ip6 nexthdr icmpv6 icmpv6 type packet-too-big accept

        # Error types - allow for both
        ip6 nexthdr icmpv6 icmpv6 type {
            destination-unreachable,
            time-exceeded,
            parameter-problem
        } accept

        # NDP - link-local only
        ip6 saddr fe80::/10 ip6 nexthdr icmpv6 icmpv6 type {
            nd-router-solicit,
            nd-router-advert,
            nd-neighbor-solicit,
            nd-neighbor-advert
        } accept

        # Echo request - rate limited
        ip6 nexthdr icmpv6 icmpv6 type echo-request limit rate 10/second accept
        ip6 nexthdr icmpv6 drop   # Drop remaining ICMPv6

        # Bogon source filtering (IPv6)
        ip6 saddr @BOGON6 drop

        # ==== Services ====

        # SSH from management networks
        tcp dport 22 ip6 saddr @MGMT_NETS accept
        tcp dport 22 ip saddr @MGMT_NETS4 accept

        # Web services - both protocols
        tcp dport { 80, 443 } accept

        # DNS (if this is a DNS server)
        udp dport 53 accept
        tcp dport 53 accept

        # Logging before final drop
        limit rate 5/minute log prefix "inet-drop: "
    }

    # ==================================================
    # Forward chain
    # ==================================================

    chain forward {
        type filter hook forward priority 0;
        policy drop;

        ct state established,related accept
        ct state invalid drop

        # Allow Packet Too Big forwarding (required for PMTUD)
        ip6 nexthdr icmpv6 icmpv6 type packet-too-big accept

        # Router-specific: allow forwarding between trusted zones
        # iifname "eth1" oifname "eth0" accept   # LAN to WAN
        # iifname "eth0" oifname "eth1" ct state established,related accept
    }

    # ==================================================
    # Output chain
    # ==================================================

    chain output {
        type filter hook output priority 0;
        policy accept;
    }
}
```

## Apply and Verify

```bash
# Validate syntax (dry run)
nft -c -f /etc/nftables.conf

# Apply
nft -f /etc/nftables.conf

# Verify ruleset loaded
nft list ruleset | head -50

# Test IPv4 connectivity
ping -c 2 8.8.8.8

# Test IPv6 connectivity
ping6 -c 2 2001:4860:4860::8888
```

## Protocol-Specific Rules in inet Context

When you need different rules for IPv4 vs IPv6:

```bash
# IPv4-specific rule
ip protocol tcp tcp dport 80 accept

# IPv6-specific rule
ip6 nexthdr tcp tcp dport 80 accept

# Both: Simply omit the protocol selector
tcp dport 80 accept   # Applies to both IPv4 TCP and IPv6 TCP
```

## Named Sets for Dynamic Blocklists

```bash
# Define a blocklist set
table inet blocklist {
    set bad-ipv6 {
        type ipv6_addr
        flags timeout
        timeout 1h    # Auto-expire entries after 1 hour
    }

    chain input {
        type filter hook input priority -10;  # Before main filter
        ip6 saddr @bad-ipv6 drop
    }
}

# Add an address to block
nft add element inet blocklist bad-ipv6 { 2001:db8:1::1 }

# Remove an address
nft delete element inet blocklist bad-ipv6 { 2001:db8:1::1 }
```

## Persistence

```bash
# Save current ruleset
nft list ruleset > /etc/nftables.conf

# Enable auto-start on boot
systemctl enable nftables

# Reload without service restart
nft -f /etc/nftables.conf
```

## Summary

nftables `inet` family provides unified IPv4+IPv6 firewall rules in a single ruleset. Use `table inet filter` instead of separate `table ip` and `table ip6` tables. Protocol-specific syntax: `ip protocol` for IPv4-specific, `ip6 nexthdr` for IPv6-specific, or no protocol selector for rules that apply to both. Critical IPv6-specific rules: always include `icmpv6 type packet-too-big accept` and NDP acceptance from fe80::/10. Use named sets (`type ipv6_addr`, `type ipv4_addr`) for maintainable address groups. Validate with `nft -c -f file` before applying.
