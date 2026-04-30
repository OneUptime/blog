# How to Write ip6tables Rules for Outgoing IPv6 Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ip6tables, Firewall, Linux, Egress

Description: Learn how to control outgoing IPv6 traffic with ip6tables OUTPUT chain rules, including restricting egress to specific services, preventing data exfiltration, and blocking unauthorized tunneling.

## Overview

While most servers use a permissive OUTPUT policy (`ACCEPT` all), restricting outbound IPv6 traffic is valuable for security-critical hosts. Egress filtering prevents compromised servers from initiating unauthorized connections, exfiltrating data, or becoming botnet nodes. This guide covers OUTPUT chain rules for both servers and end-user workstations.

## Default OUTPUT Policy Options

```bash
# Permissive (most servers): Allow all outbound, control inbound

ip6tables -P OUTPUT ACCEPT

# Restrictive (high-security): Explicitly control outbound
ip6tables -P OUTPUT DROP
```

Most servers use ACCEPT, but consider DROP for:
- Database servers that should never initiate external connections
- Payment processing systems
- Hosts in high-security zones

## Basic Outgoing Rules

```bash
# Loopback - always allow
ip6tables -A OUTPUT -o lo -j ACCEPT

# Established/related traffic for existing connections
ip6tables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Essential ICMPv6 outgoing
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type echo-request -j ACCEPT    # Pings we initiate
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type echo-reply -j ACCEPT      # Replies to pings
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type destination-unreachable -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type time-exceeded -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type parameter-problem -j ACCEPT
# NDP on link-local
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type neighbour-solicitation -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type neighbour-advertisement -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type router-solicitation -j ACCEPT
```

## Service-Specific Outgoing Rules

### Allow Only Necessary Outbound Connections

```bash
# DNS - only to authorized resolvers
ip6tables -A OUTPUT -p udp --dport 53 -d 2001:4860:4860::8888 -j ACCEPT  # Google DNS
ip6tables -A OUTPUT -p udp --dport 53 -d 2001:4860:4860::8844 -j ACCEPT
ip6tables -A OUTPUT -p tcp --dport 53 -d 2001:4860:4860::8888 -j ACCEPT
ip6tables -A OUTPUT -p tcp --dport 53 -d 2001:4860:4860::8844 -j ACCEPT

# NTP - only to authorized time servers
ip6tables -A OUTPUT -p udp --dport 123 -d 2610:20:6f15:15::27 -j ACCEPT  # NIST NTP

# Outbound HTTP/HTTPS - for package updates, API calls
ip6tables -A OUTPUT -p tcp --dport 80 -j ACCEPT
ip6tables -A OUTPUT -p tcp --dport 443 -j ACCEPT

# SMTP outbound (mail relay)
ip6tables -A OUTPUT -p tcp --dport 25 -d 2001:db8:100::25 -j ACCEPT

# Database connections to specific backend
ip6tables -A OUTPUT -p tcp --dport 5432 -d 2001:db8:db::/64 -j ACCEPT
```

## Anti-Spoofing: Restrict Outbound Source Addresses

```bash
# Put source validation in its own chain and jump to it before your service-specific OUTPUT rules
ip6tables -N OUTPUT-SPOOF-CHECK
ip6tables -A OUTPUT -j OUTPUT-SPOOF-CHECK
ip6tables -A OUTPUT-SPOOF-CHECK -s 2001:db8:100::/48 -j RETURN
ip6tables -A OUTPUT-SPOOF-CHECK -s fe80::/10 -j RETURN   # Link-local
ip6tables -A OUTPUT-SPOOF-CHECK -s ::1/128 -j RETURN     # Loopback
# All other sources = spoofed
ip6tables -A OUTPUT-SPOOF-CHECK -j LOG --log-prefix "IPv6-SPOOF-OUT: "
ip6tables -A OUTPUT-SPOOF-CHECK -j DROP
```

## Block Unauthorized Tunneling

```bash
# Block IPv6-in-IPv4 tunnels (protocol 41)
# Note: This is iptables (IPv4) not ip6tables - tunneling is at IPv4 level
iptables -A OUTPUT -p 41 -j DROP   # Use iptables for this, not ip6tables

# Block Teredo outbound
iptables -A OUTPUT -p udp --dport 3544 -j DROP

# Block GRE tunnels
iptables -A OUTPUT -p 47 -j DROP
```

## DNS Restriction to Prevent Covert Channels

```bash
# Only allow DNS to authorized resolvers
ip6tables -A OUTPUT -p udp --dport 53 -j DROP   # Block DNS to all other destinations
ip6tables -A OUTPUT -p tcp --dport 53 -j DROP
# (Add specific resolver rules BEFORE these drop rules)
```

## Outgoing Rules for Workstations

```bash
# Workstation: Allow typical user services
ip6tables -P OUTPUT ACCEPT   # Usually permissive for workstations
# Add specific blocks for restricted environments:

# Block access to sensitive internal subnets
ip6tables -A OUTPUT -d 2001:db8:200::/48 -j DROP   # Can't reach production from workstation
ip6tables -A OUTPUT -d fd00:1234::/48 -j DROP      # Can't reach management network
```

## Log Unusual Outbound Activity

```bash
# Log and track unusual outbound destinations
ip6tables -A OUTPUT -p tcp --dport 6667 -j LOG --log-prefix "IRC-OUTBOUND: "  # IRC (C2)
ip6tables -A OUTPUT -p tcp --dport 4444 -j LOG --log-prefix "SUSPICIOUS-OUT: " # Common backdoor
ip6tables -A OUTPUT -p tcp --dport 31337 -j LOG --log-prefix "BACKDOOR-OUT: "
```

## Complete Restrictive OUTPUT Policy Example

```bash
#!/bin/bash
# High-security server: restrictive egress
ip6tables -F OUTPUT
ip6tables -F OUTPUT-SPOOF-CHECK 2>/dev/null
ip6tables -X OUTPUT-SPOOF-CHECK 2>/dev/null
ip6tables -P OUTPUT DROP
ip6tables -N OUTPUT-SPOOF-CHECK

# Loopback
ip6tables -A OUTPUT -o lo -j ACCEPT

# Anti-spoofing check
ip6tables -A OUTPUT -j OUTPUT-SPOOF-CHECK

# Established/related traffic for existing connections
ip6tables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# ICMPv6 essential
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type 1 -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type 2 -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type 3 -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type 4 -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type 135 -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type 136 -j ACCEPT

# DNS to authorized resolvers only
ip6tables -A OUTPUT -p udp --dport 53 -d 2001:db8::53 -j ACCEPT
ip6tables -A OUTPUT -p tcp --dport 53 -d 2001:db8::53 -j ACCEPT

# HTTPS for package updates/API calls
ip6tables -A OUTPUT -p tcp --dport 443 -j ACCEPT

# Anti-spoof: only our IP as source
ip6tables -A OUTPUT-SPOOF-CHECK -s 2001:db8:100::10 -j RETURN
ip6tables -A OUTPUT-SPOOF-CHECK -s fe80::/10 -j RETURN
ip6tables -A OUTPUT-SPOOF-CHECK -s ::1/128 -j RETURN
ip6tables -A OUTPUT-SPOOF-CHECK -j LOG --log-prefix "SPOOF-SRC: "
ip6tables -A OUTPUT-SPOOF-CHECK -j DROP

# Log everything else before dropping
ip6tables -A OUTPUT -m limit --limit 5/min -j LOG --log-prefix "IPv6-OUT-DROP: "
```

## Summary

ip6tables OUTPUT chain rules control egress IPv6 traffic. For most servers, use `ACCEPT` default but add specific drops for unauthorized tunneling (block IPv4 protocol 41 and UDP 3544 with iptables) and restrict DNS to authorized resolvers. For high-security hosts, use DROP default and explicitly permit: loopback, established connections, essential ICMPv6, DNS to authorized servers, and required service ports. Always include anti-spoofing rules ensuring only your assigned prefix and other legitimate local sources appear as source addresses. Log unusual outbound activity (IRC ports, backdoor ports) before dropping.
