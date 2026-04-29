# How to Configure IPv6 Policy Routing in SD-WAN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Policy Routing, SD-WAN, PBR, Route Maps, Traffic Engineering

Description: Configure IPv6 policy-based routing in SD-WAN environments to steer specific IPv6 traffic flows based on source/destination prefix, DSCP, application, or other criteria.

---

IPv6 policy-based routing (PBR) in SD-WAN directs IPv6 traffic based on policies rather than destination-only routing. This enables steering VoIP over low-latency links, video over high-bandwidth paths, and critical applications over premium MPLS while bulk traffic uses cheaper broadband.

## Linux IPv6 Policy Routing

```bash
#!/bin/bash
# ipv6-policy-routing.sh - Policy routing for SD-WAN IPv6

# Create routing tables for different WAN paths

# Table 200: MPLS (low latency, premium)
# Table 201: Broadband (high bandwidth, cheaper)
# Table 202: LTE (backup)

# Add routes to each table
# MPLS next-hop
ip -6 route add default via 2001:db8:100::1 dev eth0 table 200
# Broadband next-hop
ip -6 route add default via 2001:db8:201::1 dev eth1 table 201
# LTE backup next-hop
ip -6 route add default via 2001:db8:202::1 dev eth2 table 202

# Create IPv6 rules for policy routing

# Rule 1: VoIP traffic (traffic class 0xb8 = DSCP EF, ECN 00) → MPLS
ip -6 rule add from ::/0 to ::/0 \
    tos 0xb8 \
    lookup 200 \
    pref 100

# Rule 2: Traffic from VoIP VLAN → MPLS
ip -6 rule add from 2001:db8:10::/64 \
    lookup 200 \
    pref 110

# Rule 3: Video traffic (traffic class 0x88 = DSCP AF41, ECN 00) → Broadband
ip -6 rule add from ::/0 to ::/0 \
    tos 0x88 \
    lookup 201 \
    pref 120

# Rule 4: Bulk/backup traffic → LTE
ip -6 rule add from 2001:db8:20::/64 \
    lookup 202 \
    pref 130

# The kernel already provides the default main/default RPDB rules

# Show all rules
ip -6 rule show
ip -6 route show table 200
```

## nftables IPv6 Traffic Marking for PBR

```bash
# /etc/nftables-pbr.conf - Mark IPv6 packets for policy routing

table ip6 sd_wan_pbr {
    chain prerouting {
        type filter hook prerouting priority mangle; policy accept;

        # Mark VoIP RTP for MPLS path (mark 200)
        udp dport 10000-20000 meta mark set 200 counter

        # Mark SIP signaling for MPLS path (mark 200)
        udp dport 5060 meta mark set 200 counter
        tcp dport 5060 meta mark set 200 counter

        # Mark video streaming for broadband (mark 201)
        ip6 dscp af41 tcp dport { 80, 443, 8080 } \
            meta mark set 201 counter

        # Mark bulk transfers for LTE backup (mark 202)
        tcp dport { 20, 21 } meta mark set 202 counter
    }
}
```

```bash
# Load nftables and configure fwmark routing
sudo nft -f /etc/nftables-pbr.conf

# Add higher-priority routing rules based on the nftables marks
ip -6 rule add fwmark 200 lookup 200 pref 90
ip -6 rule add fwmark 201 lookup 201 pref 91
ip -6 rule add fwmark 202 lookup 202 pref 92
```

## Cisco IOS XE IPv6 Policy Routing

```text
! Create IPv6 access-lists for classification
ipv6 access-list VOIP-IPV6
 permit udp 2001:db8:10::/64 any range 10000 20000 dscp ef
 permit udp 2001:db8:10::/64 any eq 5060

ipv6 access-list VIDEO-IPV6
 permit tcp 2001:db8:10::/64 any dscp af41

ipv6 access-list BULK-IPV6
 permit tcp 2001:db8:20::/64 any eq 21

! Route maps for policy routing
route-map PBR-IPV6 permit 10
 match ipv6 address VOIP-IPV6
 set ipv6 next-hop 2001:db8:100::1

route-map PBR-IPV6 permit 20
 match ipv6 address VIDEO-IPV6
 set ipv6 next-hop 2001:db8:201::1

route-map PBR-IPV6 permit 30
 match ipv6 address BULK-IPV6
 set ipv6 next-hop 2001:db8:202::1

! Apply to LAN interface
interface GigabitEthernet0/1
 ipv6 address 2001:db8:10::1/64
 ipv6 policy route-map PBR-IPV6

! Verify
show ipv6 policy
show route-map PBR-IPV6
```

## Juniper IPv6 Policy Routing

```text
# Juniper firewall filter for IPv6 PBR
set firewall family inet6 filter PBR-SD-WAN-IPV6 term VOIP-TRAFFIC from \
    traffic-class ef

set firewall family inet6 filter PBR-SD-WAN-IPV6 term VOIP-TRAFFIC then \
    next-ip6 2001:db8:100::1

set firewall family inet6 filter PBR-SD-WAN-IPV6 term VIDEO-TRAFFIC from \
    traffic-class af41

set firewall family inet6 filter PBR-SD-WAN-IPV6 term VIDEO-TRAFFIC then \
    next-ip6 2001:db8:201::1

set firewall family inet6 filter PBR-SD-WAN-IPV6 term BULK-TRAFFIC from \
    source-address 2001:db8:20::/64

set firewall family inet6 filter PBR-SD-WAN-IPV6 term BULK-TRAFFIC then \
    next-ip6 2001:db8:202::1

set firewall family inet6 filter PBR-SD-WAN-IPV6 term DEFAULT then accept

# Apply to LAN interface
set interfaces ge-0/0/1 unit 0 family inet6 filter input PBR-SD-WAN-IPV6
```

## Verify IPv6 Policy Routing

```bash
# Verify rules are being matched
ip -6 rule show
# Expected:
# 90: from all fwmark 0xc8 lookup 200
# 110: from 2001:db8:10::/64 lookup 200

# Test routing decision for a marked IPv6 flow
ip -6 route get 2001:db8:30::1 from 2001:db8:10::50 mark 200
# Should show: via 2001:db8:100::1 dev eth0

# Monitor policy route hits
nft list chain ip6 sd_wan_pbr prerouting

# Trace packet path
tcptraceroute6 2001:db8:30::1 80 -s 2001:db8:10::50
```

IPv6 policy-based routing in SD-WAN combines Linux routing tables with nftables fwmark rules or router PBR features to steer traffic by source prefix, traffic class, or destination service, enabling fine-grained path selection that aligns IPv6 traffic with appropriate WAN links based on cost, performance, and application requirements.
