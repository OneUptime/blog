# How to Implement IPv6 Egress Filtering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Security, Egress Filtering, DLP, Network Security

Description: Learn how to implement IPv6 egress filtering to prevent data exfiltration, unauthorized tunneling, and spoofed traffic leaving your network.

## Overview

IPv6 egress filtering controls what traffic leaves your network. While ingress filtering (BCP 38) validates traffic at the network edge so spoofed source addresses are not propagated, egress filtering prevents your own hosts from sending spoofed or unauthorized traffic, blocks data exfiltration channels, and stops unauthorized tunneling mechanisms from leaving the network.

## Egress Filtering Goals

1. **Anti-spoofing**: Prevent hosts from sending packets with source addresses not assigned to them
2. **Tunnel blocking**: Stop unauthorized IPv6-in-IPv4 tunnels
3. **Protocol restriction**: Block protocols not needed on egress (e.g., raw IPv6 tunnels)
4. **Data exfiltration prevention**: Block DNS covert channels, IPv6 covert channels
5. **Bogon prevention**: Don't let internal bogon addresses reach the internet

## Anti-Spoofing Egress Filtering

Ensure only packets with valid source addresses exit:

```bash
# nftables: Only allow legitimate source prefixes on egress

nft add table ip6 egress
nft 'add chain ip6 egress output { type filter hook output priority 0; }'

# Only permit traffic with our assigned prefix as source
nft add rule ip6 egress output ip6 saddr 2001:db8:100::/48 accept
nft add rule ip6 egress output ip6 saddr fe80::/10 accept    # Allow link-local
nft add rule ip6 egress output ip6 saddr ::/128 accept       # Allow DAD/RS during autoconfiguration
nft add rule ip6 egress output ip6 saddr ::1 accept          # Allow loopback
nft add rule ip6 egress output log prefix "IPv6-SPOOF-EGRESS: " drop

# ip6tables equivalent
ip6tables -A OUTPUT -s 2001:db8:100::/48 -j ACCEPT
ip6tables -A OUTPUT -s fe80::/10 -j ACCEPT
ip6tables -A OUTPUT -s ::/128 -j ACCEPT
ip6tables -A OUTPUT -s ::1 -j ACCEPT
ip6tables -A OUTPUT -j LOG --log-prefix "IPv6-SPOOF-EGRESS: "
ip6tables -A OUTPUT -j DROP
```

## Block Unauthorized Tunneling on Egress

```bash
# Block IPv6-in-IPv4 tunnels leaving the network
iptables -A OUTPUT  -p 41 -j DROP
iptables -A FORWARD -p 41 -j DROP

# Block Teredo outbound
iptables -A OUTPUT  -p udp --dport 3544 -j DROP
iptables -A FORWARD -p udp --dport 3544 -j DROP

# Block 6to4 relay
iptables -A OUTPUT  -d 192.88.99.0/24 -j DROP
iptables -A FORWARD -d 192.88.99.0/24 -j DROP

# Block GRE tunnels
iptables -A OUTPUT  -p 47 -j DROP
iptables -A FORWARD -p 47 -j DROP
```

## Block Bogon Destinations on Egress

Don't route traffic destined for bogon prefixes:

```bash
# ip6tables: Drop egress traffic to documentation/bogon destinations
ip6tables -A OUTPUT -d 2001:db8::/32 -j DROP    # Documentation
ip6tables -A OUTPUT -d 0100::/64 -j DROP         # Discard prefix
ip6tables -A OUTPUT -d 2002::/16 -j DROP         # 6to4 deprecated
```

## DNS Egress Filtering to Prevent Covert Channels

```bash
# Only allow DNS to authorized resolvers
ip6tables -A OUTPUT -p udp --dport 53 -d 2001:db8:53::53 -j ACCEPT
ip6tables -A OUTPUT -p udp --dport 53 -d 2001:db8:53::54 -j ACCEPT
ip6tables -A OUTPUT -p udp --dport 53 -j DROP    # Block DNS to unauthorized resolvers
ip6tables -A OUTPUT -p tcp --dport 53 -d 2001:db8:53::53 -j ACCEPT
ip6tables -A OUTPUT -p tcp --dport 53 -d 2001:db8:53::54 -j ACCEPT
ip6tables -A OUTPUT -p tcp --dport 53 -j DROP
```

## Cisco Egress ACL

```text
! Cisco: Egress ACL on internet-facing interface
ipv6 access-list EGRESS-INTERNET
  permit ipv6 2001:db8:100::/48 any   ! Allow our prefix
  permit icmp any any nd-ns           ! Preserve neighbor discovery
  permit icmp any any nd-na           ! Preserve neighbor discovery
  deny   ipv6 ::/128 any              ! Unspecified source
  deny   ipv6 fc00::/7 any            ! ULA to internet
  deny   ipv6 fe80::/10 any           ! Link-local to internet
  deny   ipv6 any any log

interface GigabitEthernet0/0
  description Internet uplink
  ipv6 traffic-filter EGRESS-INTERNET out
```

## Juniper Egress Firewall Policy

```text
# JunOS: Egress filtering on internet interface
set firewall family inet6 filter EGRESS-INTERNET term allow-corp from source-address 2001:db8:100::/48
set firewall family inet6 filter EGRESS-INTERNET term allow-corp then accept
set firewall family inet6 filter EGRESS-INTERNET term allow-nd from next-header icmp6
set firewall family inet6 filter EGRESS-INTERNET term allow-nd from icmp-type [neighbor-solicit neighbor-advertisement]
set firewall family inet6 filter EGRESS-INTERNET term allow-nd then accept
set firewall family inet6 filter EGRESS-INTERNET term deny-bogon-src from source-address [::/128 fc00::/7 fe80::/10]
set firewall family inet6 filter EGRESS-INTERNET term deny-bogon-src then reject
set firewall family inet6 filter EGRESS-INTERNET term deny-other-src then reject

set interfaces ge-0/0/0 unit 0 family inet6 filter output EGRESS-INTERNET
```

## Egress Filter for IPv6 Extension Headers

```bash
# Block Routing Header Type 0 on egress (shouldn't be generated, but belt-and-suspenders)
ip6tables -A OUTPUT   -m rt --rt-type 0 -j DROP
ip6tables -A FORWARD  -m rt --rt-type 0 -j DROP
```

## Monitoring Egress

```bash
# Create a reusable log-and-drop chain for denied egress traffic
ip6tables -N EGRESS-LOG-DROP
ip6tables -A EGRESS-LOG-DROP -m limit --limit 10/min -j LOG --log-prefix "IPv6-EGRESS-DROP: " --log-level 4
ip6tables -A EGRESS-LOG-DROP -j DROP

# Use EGRESS-LOG-DROP instead of DROP in your deny rules

# Monitor for unusual egress destinations
tcpdump -i eth0 'ip6 and not dst net 2001:db8:100::/48' -n -l | \
  awk '{print $5}' | sort | uniq -c | sort -rn | head -20
```

## Summary

IPv6 egress filtering prevents spoofed source addresses from leaving your network (anti-spoofing), blocks unauthorized tunneling mechanisms (protocol 41, Teredo, GRE) outbound, restricts DNS to authorized resolvers to prevent covert channels, and drops traffic sourced from bogon prefixes. Implement at the router interface with ACLs (Cisco/Juniper) or at the Linux level with ip6tables/nftables. Log denied egress traffic for audit and incident response purposes, ideally with rate limiting.
