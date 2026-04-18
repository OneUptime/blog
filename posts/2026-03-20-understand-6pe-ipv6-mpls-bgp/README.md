# How to Understand 6PE: IPv6 over MPLS with BGP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, 6PE, MPLS, BGP, Label Switching, ISP, Provider Edge

Description: Understand 6PE (IPv6 Provider Edge) architecture for transporting IPv6 over MPLS backbones without upgrading the MPLS core, using MP-BGP to distribute IPv6 prefixes with MPLS labels.

---

6PE (RFC 4798) enables IPv6 routing over an IPv4-only MPLS backbone. Provider Edge (PE) routers maintain dual-stack capability and use Multi-Protocol BGP (MP-BGP) with the IPv6 address family to exchange IPv6 routes with MPLS labels. The MPLS core remains IPv4-only.

## 6PE Architecture

```text
6PE Network Architecture:

[IPv6 CE] ─── [PE1] ═══ MPLS Backbone (IPv4) ═══ [PE2] ─── [IPv6 CE]
               |                                    |
         Dual-stack PE                        Dual-stack PE
         (IPv4 + IPv6)                        (IPv4 + IPv6)

Traffic Flow:
1. IPv6 packet arrives at PE1 from CE
2. PE1 looks up IPv6 destination in MP-BGP table
3. PE1 adds MPLS label (learned from PE2 via MP-BGP)
4. MPLS core switches based on labels (IPv4-only P routers)
5. PE2 removes label, forwards IPv6 to destination CE

Key Properties:
- P (Provider) routers: IPv4 + LDP only, NO IPv6
- PE routers: Dual-stack + MP-BGP with IPv6 address family
- CE routers: Pure IPv6
- No tunneling, no 6in4 encapsulation - native MPLS labels
```

## 6PE vs 6VPE

```text
6PE vs 6VPE Comparison:
┌─────────────────┬───────────────────────┬────────────────────────┐
│ Feature         │ 6PE                   │ 6VPE                   │
├─────────────────┼───────────────────────┼────────────────────────┤
│ VPN             │ No VPN, global routing│ Yes, VRF-based VPNs    │
│ MP-BGP          │ IPv6 address family   │ IPv6 VPN address family │
│ Labels          │ One label (LDP LSP)   │ Two labels (VPN+LDP)   │
│ Use case        │ ISP IPv6 transit      │ Enterprise IPv6 VPNs   │
│ Customer sep    │ No                    │ Yes (VRFs)             │
└─────────────────┴───────────────────────┴────────────────────────┘
```

## MP-BGP for 6PE

```text
MP-BGP IPv6 Address Family Exchange:

PE1 advertises to PE2 via MP-BGP:
  NLRI (Network Layer Reachability Information):
    - IPv6 prefix: 2001:db8:site-a::/48
    - MPLS label: 1001 (assigned by PE1)
    - Next-hop: PE1's IPv4 loopback as IPv4-mapped IPv6: ::ffff:10.0.0.1

PE2 advertises to PE1 via MP-BGP:
  NLRI:
    - IPv6 prefix: 2001:db8:site-b::/48
    - MPLS label: 2001 (assigned by PE2)
    - Next-hop: ::ffff:10.0.0.2

BGP UPDATE message contains:
  Path attribute: MP_REACH_NLRI (Type 14)
  AFI: 2 (IPv6)
  SAFI: 4 (NLRI with MPLS Labels)
```

## Verify 6PE Forwarding

```bash
# On PE router (Cisco IOS/IOS XE):

# Verify MP-BGP IPv6 neighbors

show bgp ipv6 unicast summary

# View IPv6 BGP table with labels
show bgp ipv6 unicast
# Look for: *>i 2001:db8:site-b::/48 ... label 2001

# Check CEF entry for IPv6
show ipv6 cef 2001:db8:site-b::/48

# Verify MPLS forwarding
show mpls forwarding-table | include 2001:db8

# Trace 6PE path (labels should appear)
traceroute ipv6 2001:db8:site-b::10 source 2001:db8:site-a::1

# On MPLS backbone (P router - should only see labels):
show mpls forwarding-table | include 1001
# P routers only see MPLS labels, no IPv6

# Debug 6PE label assignment
debug bgp ipv6 unicast updates
debug mpls lfib entry
```

## 6PE Label Allocation Example

```text
6PE Label Stack Operation:

Packet: IPv6 src=2001:db8:a::1 dst=2001:db8:b::10

PE1 (Ingress):
  1. Lookup dst in MP-BGP IPv6 table
  2. Find: 2001:db8:b::/48 → label 2001, nexthop PE2 (10.0.0.2)
  3. Find: PE2 LDP label for 10.0.0.2 → label 16 (LDP IGP label)
  4. Push label stack: [16 | 2001] + IPv6 packet

P-Router (Core):
  See only label 16 → swap to label 17 → forward toward PE2
  IPv6 is hidden inside, no IPv6 table lookup needed

PE2 (Egress):
  Receive label 2001 (PHP may pop outer label)
  Pop label 2001, lookup IPv6 dst in local table
  Forward IPv6 to CE via interface

PHP (Penultimate Hop Popping):
  Last P router pops outer LDP label
  PE2 receives only: label 2001 + IPv6 packet
  Reduces PE2 lookup to one step
```

6PE enables ISPs to offer native IPv6 transit services over existing IPv4 MPLS backbones without upgrading every P router to support IPv6, with only PE routers requiring dual-stack capability and MP-BGP configuration, making it an operationally efficient migration path to IPv6 for MPLS service providers.
