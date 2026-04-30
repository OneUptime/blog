# How to Allow Essential ICMPv6 Through a Firewall

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Firewall, IPv6 Security, Ip6tables, nftables

Description: Configure firewall rules to allow essential ICMPv6 messages while blocking non-essential ones, using ip6tables, nftables, and firewalld with practical rule examples.

## Introduction

The minimal ICMPv6 allow-list for a working IPv6 network requires allowing specific message types based on whether you're configuring a host firewall or a transit firewall. This guide provides ready-to-use firewall rules for the most common tools (ip6tables, nftables, firewalld) that ensure IPv6 connectivity is maintained while limiting unnecessary ICMPv6 exposure.

## Minimum ICMPv6 Rules for a Host

```bash
# Host firewall minimum: allows IPv6 to function completely

# Using ip6tables - this example appends rules to the existing filter table
# Do not run 'sudo ip6tables -F' unless you intend to flush the whole filter table

# 1. Packet Too Big (PMTUD - CRITICAL)
sudo ip6tables -A INPUT  -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT

# 2. Error messages (important for connectivity diagnosis)
sudo ip6tables -A INPUT  -p icmpv6 --icmpv6-type destination-unreachable -j ACCEPT
sudo ip6tables -A INPUT  -p icmpv6 --icmpv6-type time-exceeded -j ACCEPT
sudo ip6tables -A INPUT  -p icmpv6 --icmpv6-type parameter-problem -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type destination-unreachable -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type time-exceeded -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type parameter-problem -j ACCEPT

# 3. NDP (CRITICAL - without these, IPv6 doesn't work at all)
sudo ip6tables -A INPUT  -p icmpv6 --icmpv6-type router-advertisement   -j ACCEPT
sudo ip6tables -A INPUT  -p icmpv6 --icmpv6-type neighbor-solicitation   -j ACCEPT
sudo ip6tables -A INPUT  -p icmpv6 --icmpv6-type neighbor-advertisement  -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type router-solicitation     -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type neighbor-solicitation   -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type neighbor-advertisement  -j ACCEPT

# 4. MLD (for multicast listener discovery; often needed on LANs with MLD snooping)
sudo ip6tables -A INPUT  -p icmpv6 --icmpv6-type 130 -j ACCEPT  # MLD Query
sudo ip6tables -A INPUT  -p icmpv6 --icmpv6-type 131 -j ACCEPT  # MLD Report
sudo ip6tables -A INPUT  -p icmpv6 --icmpv6-type 132 -j ACCEPT  # MLD Done
sudo ip6tables -A INPUT  -p icmpv6 --icmpv6-type 143 -j ACCEPT  # MLDv2 Report
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type 131 -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type 132 -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type 143 -j ACCEPT

# 5. Echo (useful for diagnostics, optional but recommended)
sudo ip6tables -A INPUT  -p icmpv6 --icmpv6-type echo-request -j ACCEPT
sudo ip6tables -A INPUT  -p icmpv6 --icmpv6-type echo-reply   -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type echo-request -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type echo-reply   -j ACCEPT
```

## Transit Router/Firewall Rules

```bash
# Transit firewall: allow ICMPv6 through but block link-local-only types

# Allow essential ICMPv6 through (FORWARD chain)
sudo ip6tables -A FORWARD -p icmpv6 -m icmpv6 --icmpv6-type packet-too-big         -j ACCEPT
sudo ip6tables -A FORWARD -p icmpv6 -m icmpv6 --icmpv6-type destination-unreachable -j ACCEPT
sudo ip6tables -A FORWARD -p icmpv6 -m icmpv6 --icmpv6-type time-exceeded           -j ACCEPT
sudo ip6tables -A FORWARD -p icmpv6 -m icmpv6 --icmpv6-type parameter-problem       -j ACCEPT
sudo ip6tables -A FORWARD -p icmpv6 -m icmpv6 --icmpv6-type echo-request            -j ACCEPT
sudo ip6tables -A FORWARD -p icmpv6 -m icmpv6 --icmpv6-type echo-reply              -j ACCEPT

# Block NDP at transit (link-local only - should never be forwarded)
sudo ip6tables -A FORWARD -p icmpv6 -m icmpv6 --icmpv6-type router-solicitation    -j DROP
sudo ip6tables -A FORWARD -p icmpv6 -m icmpv6 --icmpv6-type router-advertisement   -j DROP
sudo ip6tables -A FORWARD -p icmpv6 -m icmpv6 --icmpv6-type neighbor-solicitation  -j DROP
sudo ip6tables -A FORWARD -p icmpv6 -m icmpv6 --icmpv6-type neighbor-advertisement -j DROP
```

## nftables Equivalent

```bash
# nftables rules for a host that explicitly permits essential ICMPv6

sudo nft -f - << 'EOF'
table ip6 filter {
    chain input {
        type filter hook input priority 0; policy accept;

        # Accept loopback
        iif lo accept

        # Allow established/related traffic
        ct state established,related accept
        ct state invalid drop

        # Essential ICMPv6 (NEVER block these)
        icmpv6 type packet-too-big accept
        icmpv6 type { destination-unreachable, time-exceeded, parameter-problem } accept

        # NDP (required for IPv6 address resolution and SLAAC)
        icmpv6 type { nd-router-advert, nd-neighbor-solicit, nd-neighbor-advert } accept

        # MLD (for multicast listener discovery)
        icmpv6 type { mld-listener-query, mld-listener-report, mld-listener-done } accept
        icmpv6 type mld2-listener-report accept

        # Echo (optional but useful)
        icmpv6 type { echo-request, echo-reply } accept
    }

    chain output {
        type filter hook output priority 0; policy accept;

        # Accept loopback
        oif lo accept

        # Allow established/related traffic
        ct state established,related accept
        ct state invalid drop

        # ICMPv6 generated by the host
        icmpv6 type packet-too-big accept
        icmpv6 type { destination-unreachable, time-exceeded, parameter-problem } accept

        # NDP required for local-link IPv6 operation
        icmpv6 type { nd-router-solicit, nd-neighbor-solicit, nd-neighbor-advert } accept

        # MLD listener reports sent by the host
        icmpv6 type { mld-listener-report, mld-listener-done } accept
        icmpv6 type mld2-listener-report accept

        # Echo (optional but useful)
        icmpv6 type { echo-request, echo-reply } accept
    }
}
EOF
```

## firewalld Configuration

```bash
# Using firewalld: check ICMPv6-related settings
# Add --zone=<zone> if you're not using the default zone

# List blocked ICMP types in the zone
sudo firewall-cmd --list-icmp-blocks

# Check whether ICMP block inversion is enabled
sudo firewall-cmd --query-icmp-block-inversion

# Ensure essential ICMPv6 types are NOT blocked
sudo firewall-cmd --remove-icmp-block=packet-too-big --permanent
sudo firewall-cmd --remove-icmp-block=router-advertisement --permanent
sudo firewall-cmd --remove-icmp-block=neighbour-advertisement --permanent
sudo firewall-cmd --remove-icmp-block=neighbour-solicitation --permanent
sudo firewall-cmd --reload

# On modern firewalld, verify the built-in IPv6 bootstrap policy
sudo firewall-cmd --info-policy=allow-host-ipv6

# Check final state
sudo firewall-cmd --list-all
```

## Conclusion

Allowing essential ICMPv6 requires a specific allow-list rather than open acceptance of all ICMPv6. For hosts: allow Packet Too Big, NDP types (RA/NS/NA), MLD, and error messages. For transit firewalls: allow the same error messages and Echo, but block NDP at the transit boundary. Using named icmpv6-type values in ip6tables (like `--icmpv6-type packet-too-big`) is more readable and maintainable than using numeric type values. The nftables approach with sets of icmpv6 types is the most concise modern option.
