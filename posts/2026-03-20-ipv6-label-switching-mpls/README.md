# How IPv6 Label Switching Works in MPLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MPLS, Label Switching, LDP, RSVP, LSP, Forwarding, Data Plane

Description: Understand how MPLS label switching handles IPv6 packets including label allocation for IPv6 prefixes, label stacking in 6PE/6VPE, and MPLS forwarding plane behavior for IPv6 traffic.

---

MPLS label switching for IPv6 operates identically to IPv4 at the forwarding plane-routers switch packets based on 32-bit labels without examining the IP header. In 6PE/6VPE, IPv6 prefixes are advertised with BGP labels, while the outer transport label used across the core can come from LDP, RSVP-TE, or SR-MPLS.

## MPLS Label Structure

```text
MPLS Label Stack Entry (32 bits):
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                  Label (20 bits)                | TC|S|  TTL  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Label: 0-1048575 (labels 0-15 reserved)
TC: Traffic Class (historically called EXP)
S: Bottom of Stack (1 = last label in stack)
TTL: Time to Live

For 6PE label stack:
[LDP Transport Label (S=0)] [BGP IPv6 Label (S=1)] [IPv6 Packet]
```

## LDP Label Distribution for IPv6

```bash
# In 6PE, LDP normally distributes transport labels for IPv4 core prefixes

# For 6PE, LDP provides transport labels; BGP provides IPv6 labels

# Check LDP label bindings for the IPv4 next hop used by 6PE
show mpls ldp bindings

# Example LIB entry on Cisco IOS / IOS XE:
# lib entry: 10.0.0.2/32
#   remote binding: lsr: 10.1.1.2:0, label: 16  ← outgoing transport label

# For BGP-distributed IPv6 labels:
show bgp ipv6 unicast 2001:db8:b::/48
# ...
#   mpls label 17

show bgp ipv6 unicast labels
# Network              Next Hop               In tag/Out tag
# 2001:db8:b::/48      ::FFFF:10.0.0.2       notag/17

# Full label stack for packet to 2001:db8:b::10:
# [transport label for PE2] [BGP label 17 for 2001:db8:b::/48]
```

## MPLS Forwarding for IPv6

```text
IPv6 Packet Forwarding in 6PE MPLS:

Ingress PE (PE1):
  IPv6 packet arrives from CE: dst=2001:db8:b::10
  Lookup in inet6.0 (or CEF IPv6 table)
  Find: 2001:db8:b::/48 → BGP label 17, BGP next hop ::FFFF:10.0.0.2
  Resolve 10.0.0.2/32 in the IPv4 core → transport label 16
  Push labels: [16][17] + IPv6 packet
  Forward toward the core

P Router (Core):
  See outer transport label 16 in LFIB
  Swap it to the next transport label
  Leave inner BGP IPv6 label 17 unchanged
  Forward to next hop

Last P Router (PHP - Penultimate Hop Popping):
  See outer transport label for PE2 → PHP enabled → pop only the outer label
  Forward [17][IPv6] to PE2

Egress PE (PE2):
  Receive [17] + IPv6
  Pop label 17
  Lookup IPv6 dst in local inet6.0 / VRF
  Forward to CE

TC Bits in MPLS Header:
  Mapping IPv6 Traffic Class/DSCP to MPLS TC bits is platform- and policy-dependent
```

## RSVP-TE for IPv6 MPLS Tunnels

```bash
# Configure an RSVP-TE transport LSP that can carry labeled IPv6 traffic

# Cisco IOS - RSVP-TE tunnel used for IPv6 traffic
interface Tunnel0
 description IPv6-TE-Tunnel-to-PE2
 ip unnumbered Loopback0
 tunnel destination 10.0.0.2
 tunnel mode mpls traffic-eng
 tunnel mpls traffic-eng autoroute announce
 tunnel mpls traffic-eng bandwidth 100000
 tunnel mpls traffic-eng path-option 1 explicit name TO-PE2

! Define the explicit path for the transport LSP
ip explicit-path name TO-PE2
 next-address 10.1.1.2
 next-address 10.2.2.2

! Steer IPv6 traffic into the TE tunnel
ipv6 route 2001:db8:site-b::/48 Tunnel0
```

## Segment Routing (SR-MPLS) for IPv6

```bash
# Modern approach: SR-MPLS can replace LDP or RSVP-TE for the transport label

# Cisco IOS XE - Segment Routing with OSPFv2
segment-routing mpls
 connected-prefix-sid-map
  address-family ipv4
   10.0.0.1/32 index 1 range 1
  exit-address-family
 exit
exit

router ospf 1
 router-id 10.0.0.1
 segment-routing mpls
 segment-routing area 0 mpls

! In 6PE/6VPE, SR-MPLS provides the outer transport label;
! BGP still carries the IPv6 service label.

! Check SR state and forwarding
show ip ospf 1 segment-routing
show segment-routing mpls connected-prefix-sid-map ipv4
show mpls forwarding-table
```

## Monitor MPLS Label Usage for IPv6

```bash
# Cisco IOS / IOS XE
show mpls label range
show mpls forwarding-table
show mpls forwarding-table detail
show bgp ipv6 unicast labels

# Junos
show route forwarding-table family mpls
show route forwarding-table family inet6
show route forwarding-table label 17
show route table inet6.0
show route table bgp.l3vpn-inet6.0
```

MPLS label switching for IPv6 is protocol-agnostic at the data plane-P routers forward based solely on the 32-bit label regardless of whether the payload is IPv4, IPv6, or anything else-with 6PE and 6VPE requiring only the ingress PE to perform the initial IPv6-to-label mapping while all intermediate P routers perform fast label switching without IPv6 awareness.
