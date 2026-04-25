# How to Plan Firewall Rule Changes for IPv6 Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Firewall, Security, Migration, Network Security

Description: Plan and implement firewall rule changes for IPv6 migration, including creating parallel IPv6 rulesets, handling ICMPv6 requirements, and avoiding common IPv6 firewall mistakes.

## Introduction

IPv6 firewall planning is more complex than simply copying IPv4 rules to IPv6 equivalents. IPv6 has mandatory ICMPv6 requirements - blocking ICMPv6 breaks NDP (neighbor discovery), path MTU discovery, and router advertisements. Stateful firewalls must be configured for IPv6 separately from IPv4 on most platforms.

## Step 1: Audit Existing IPv4 Rules

Before creating IPv6 rules, document what the IPv4 ruleset does:

```bash
#!/bin/bash
# export_iptables_rules.sh

echo "=== IPv4 Rules ==="
iptables -L -n -v --line-numbers

echo ""
echo "=== Current IPv6 Rules (if any) ==="
ip6tables -L -n -v --line-numbers
```

## Step 2: Mandatory ICMPv6 Rules

At minimum, these ICMPv6 message classes must be allowed - blocking them breaks IPv6 functionality. MLD is only required when multicast is in use:

```bash
# /etc/ip6tables-essential.rules

# Essential ICMPv6 error messages for traffic to/from this host
ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type destination-unreachable -j ACCEPT
ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type packet-too-big           -j ACCEPT
ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type time-exceeded            -j ACCEPT
ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type parameter-problem        -j ACCEPT
ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type destination-unreachable -j ACCEPT
ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type packet-too-big           -j ACCEPT
ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type time-exceeded            -j ACCEPT
ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type parameter-problem        -j ACCEPT

# Allow end-to-end diagnostic traffic
ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type echo-request  -j ACCEPT
ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type echo-reply    -j ACCEPT
ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type echo-request  -j ACCEPT
ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type echo-reply    -j ACCEPT

# If this firewall forwards IPv6 traffic, allow essential error traffic and common diagnostics
ip6tables -A FORWARD -p ipv6-icmp --icmpv6-type destination-unreachable -j ACCEPT
ip6tables -A FORWARD -p ipv6-icmp --icmpv6-type packet-too-big           -j ACCEPT
ip6tables -A FORWARD -p ipv6-icmp --icmpv6-type time-exceeded            -j ACCEPT
ip6tables -A FORWARD -p ipv6-icmp --icmpv6-type parameter-problem        -j ACCEPT
ip6tables -A FORWARD -p ipv6-icmp --icmpv6-type echo-request             -j ACCEPT
ip6tables -A FORWARD -p ipv6-icmp --icmpv6-type echo-reply               -j ACCEPT

# NDP - Neighbor Solicitation and Advertisement (required for Layer 2 resolution)
ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type neighbor-solicitation  -j ACCEPT
ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type neighbor-advertisement -j ACCEPT
ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type neighbor-solicitation  -j ACCEPT
ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type neighbor-advertisement -j ACCEPT

# Router Advertisements and Solicitations (required for SLAAC)
ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type router-advertisement   -j ACCEPT
ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type router-solicitation    -j ACCEPT

# If the system is acting as a router on the segment
ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type router-solicitation    -j ACCEPT
ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type router-advertisement   -j ACCEPT

# Multicast Listener Discovery (MLD - required when IPv6 multicast is in use)
ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type mld-listener-query  -j ACCEPT
ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type mld-listener-report -j ACCEPT
ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type mld-listener-done   -j ACCEPT

# If the system is acting as a multicast router on the segment
ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type mld-listener-query  -j ACCEPT
ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type mld-listener-report -j ACCEPT
ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type mld-listener-done   -j ACCEPT
```

## Step 3: Create IPv6 Perimeter Rules

```bash
#!/bin/bash
# setup_ipv6_perimeter.sh

# Flush existing IPv6 rules
ip6tables -F
ip6tables -X

# Default policies: drop everything
ip6tables -P INPUT DROP
ip6tables -P FORWARD DROP
ip6tables -P OUTPUT ACCEPT

# Allow established/related connections
ip6tables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
ip6tables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow loopback
ip6tables -A INPUT -i lo -j ACCEPT

# Block traffic from Martian IPv6 sources
# (addresses that should never appear as source on the internet)
ip6tables -A INPUT -s ::1/128         -i eth0 -j DROP  # Loopback from external
ip6tables -A INPUT -s 2001:db8::/32   -j DROP           # Documentation prefix
ip6tables -A INPUT -s ::/128          -j DROP           # Unspecified

# Essential ICMPv6 (see Step 2 above)
ip6tables -A INPUT -p ipv6-icmp -j ACCEPT

# Allow SSH from management network only
ip6tables -A INPUT -s 2001:db8:100::/48 -p tcp --dport 22 -j ACCEPT

# Allow web traffic
ip6tables -A INPUT -p tcp --dport 80  -j ACCEPT
ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# Save rules
ip6tables-save > /etc/ip6tables.rules
```

## Step 4: Rule Comparison - IPv4 vs IPv6

Mapping common IPv4 rules to IPv6 equivalents:

| IPv4 Rule | IPv6 Equivalent | Notes |
|-----------|----------------|-------|
| `iptables -A INPUT -p icmp -j ACCEPT` | `ip6tables -A INPUT -p ipv6-icmp -j ACCEPT` | Allow required ICMPv6 types; many operators permit all ICMPv6 rather than risk breaking PMTUD/NDP |
| `iptables -A INPUT -s 10.0.0.0/8` | `ip6tables -A INPUT -s fc00::/7` | ULA is the closest analogue, not a one-to-one replacement for RFC 1918 |
| `iptables -A INPUT -s 192.168.0.0/16` | `ip6tables -A INPUT -s fc00::/7` | Same note: many IPv6 deployments use global unicast internally |
| `iptables -A INPUT -p tcp --dport 25` | Same syntax for ip6tables | Direct equivalent |
| NAT rule | Usually not needed in IPv6 | NAT66/NPTv6 exist, but IPv6 firewalls normally filter without NAT |

## Step 5: Validate Firewall Rules

```bash
# Test connectivity after applying rules
# From an external IPv6 client:
ping -6 your-server.example.com
curl -6 -v https://your-server.example.com

# Verify ICMPv6 works (NDP must function)
ip -6 neigh show
# Generate traffic first; persistent INCOMPLETE or FAILED entries can indicate NDP problems

# Check path MTU discovery
tracepath -6 2001:4860:4860::8888
# Should report the discovered PMTU and path

# Test from inside: can the server reach IPv6 internet?
curl -6 https://ipv6.icanhazip.com
```

## Step 6: nftables Unified Ruleset

Modern systems should use nftables for unified IPv4/IPv6 management:

```nftables
# /etc/nftables.conf - unified IPv4/IPv6 rules

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        iif lo accept
        ct state established,related accept

        # Essential ICMPv6
        ip6 nexthdr icmpv6 icmpv6 type {
            destination-unreachable,
            packet-too-big,
            time-exceeded,
            parameter-problem,
            echo-request, echo-reply,
            nd-neighbor-solicit, nd-neighbor-advert,
            nd-router-solicit, nd-router-advert,
            mld-listener-query, mld-listener-report,
            mld-listener-done
        } accept

        # Web traffic (both IPv4 and IPv6)
        tcp dport { 80, 443 } accept

        # SSH from management
        ip  saddr 10.0.0.0/8      tcp dport 22 accept
        ip6 saddr fd00::/8        tcp dport 22 accept
    }
}
```

## Conclusion

IPv6 firewall planning requires three things IPv4 doesn't: allowing essential ICMPv6 types (NDP, PMTUD, and MLD when multicast is in use), creating separate or unified rulesets for IPv6, and understanding that IPv6 usually does not rely on NAT at the perimeter, so global unicast addresses are directly reachable unless filtered. Never block all ICMPv6 - doing so breaks neighbor discovery and causes mysterious connectivity failures. Use nftables where possible for unified IPv4/IPv6 ruleset management, reducing the maintenance burden of maintaining parallel rule sets.
