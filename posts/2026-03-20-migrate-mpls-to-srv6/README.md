# How to Migrate from MPLS to SRv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SRv6, MPLS, Migration, Segment Routing, SR-MPLS, Network Transformation

Description: Plan and execute a migration from traditional MPLS to SRv6 (Segment Routing over IPv6), covering SRv6 architecture, migration strategies, coexistence with MPLS, and configuration examples.

---

SRv6 (Segment Routing over IPv6) replaces MPLS labels with IPv6 addresses as segment identifiers, using the IPv6 Segment Routing Header (SRH). SRv6 simplifies the network by eliminating LDP/RSVP signaling and leveraging standard IPv6 forwarding with programmable functions encoded in segment IDs.

## SRv6 vs MPLS Comparison

```javascript
SRv6 vs MPLS/SR-MPLS:
┌──────────────────┬─────────────────────┬──────────────────────────┐
│ Feature          │ MPLS / SR-MPLS      │ SRv6                     │
├──────────────────┼─────────────────────┼──────────────────────────┤
│ Data plane       │ 32-bit labels       │ IPv6 addresses as SIDs   │
│ Header           │ 4-byte label stack  │ IPv6 + SRH extension     │
│ Overhead         │ 4-8 bytes typical   │ 24+ bytes for SRH        │
│ Signaling        │ LDP, RSVP-TE        │ ISIS/OSPF-v3 extensions  │
│ VPN support      │ BGP VPNv4/VPNv6     │ BGP SRv6 VPN             │
│ Programmability  │ Limited             │ Function encoded in SID   │
│ IPv6-native      │ No (labels over IP) │ Yes                      │
└──────────────────┴─────────────────────┴──────────────────────────┘
```

## SRv6 Segment ID (SID) Structure

```text
SRv6 SID Format: <Locator>:<Function>:<Arguments>

Example: 2001:db8:router1:40::/64
         └──────────────┘└──┘
              Locator     Function

Common SRv6 Endpoint Behaviors (IANA codepoints, RFC 8986):
  End      = 1  → Endpoint (basic routing)
  End.X    = 5  → Endpoint with cross-connect (next-hop steering)
  End.T    = 9  → Endpoint with specific table
  End.DX6  = 15 → Decapsulate and forward to IPv6 nexthop
  End.DX4  = 16 → Decapsulate and forward to IPv4 nexthop
  End.DT6  = 17 → Decapsulate and route in IPv6 VRF
  End.DT4  = 18 → Decapsulate and route in IPv4 VRF

SID Examples (function bits are operator-chosen):
  2001:db8:r1:1::    → End (Router 1 endpoint)
  2001:db8:r1:5::1   → End.X to nexthop 1
  2001:db8:r1:20::   → End.DT6 (IPv6 VRF decap)
```

## Cisco IOS XE SRv6 Configuration

```text
! Enable SRv6 globally
segment-routing srv6

! Configure SRv6 locator (prefix for this router's SIDs)
segment-routing srv6
 locators
  locator PRIMARY
   prefix 2001:db8:r1::/48
   !
 !

! Configure IS-IS with SRv6
router isis 1
 address-family ipv6 unicast
  segment-routing srv6
   locator PRIMARY

! Configure SRv6 BGP VPN (replaces 6VPE)
router bgp 65000
 address-family vpnv6 unicast
  vrf CUSTOMER-A
   segment-routing srv6
    locator PRIMARY
    alloc mode per-vrf

! Verify SRv6
show segment-routing srv6 locator
show segment-routing srv6 sid
show segment-routing srv6 forwarding
```

## Linux SRv6 Configuration

```bash
# Linux kernel supports SRv6 source routing (4.10+);
# seg6local actions (End, End.X) require 4.14+;
# End.DT6 with vrftable requires 5.14+

# Enable IPv6 forwarding

sysctl -w net.ipv6.conf.all.forwarding=1

# Configure SRv6 End behavior (basic endpoint)
# When packet arrives with this SID, route to next segment
ip -6 route add 2001:db8:r1:1::/64 \
    encap seg6local action End \
    dev eth0

# Configure End.DT6 (IPv6 VRF decapsulation)
# Used for SRv6 L3VPN
ip -6 route add 2001:db8:r1:20::/64 \
    encap seg6local action End.DT6 \
    vrftable 10 \
    dev eth0

# Add SRv6 source route (encap with segment list)
ip -6 route add 2001:db8:destination::/64 \
    encap seg6 mode encap \
    segs 2001:db8:r3:1:: 2001:db8:r2:1:: 2001:db8:destination:1:: \
    dev eth0

# Test SRv6 path
ip -6 route show
ping6 -I eth0 2001:db8:destination::1
```

## Migration Strategy: MPLS to SRv6

```text
Phase 1: Deploy SRv6 in Parallel (Coexistence)
  - Enable IS-IS/OSPFv3 with SRv6 extensions on new routers
  - Run MPLS LDP and SRv6 simultaneously
  - Migrate services gradually (start with new services)

Phase 2: Migrate Services
  - 6PE → SRv6 BGP (advertise IPv6 with SRv6 SIDs instead of MPLS labels)
  - 6VPE → SRv6 L3VPN (use End.DT6 SID for VRF decap)
  - RSVP-TE → SR-TE policies (or SRv6 TE)

Phase 3: Decommission MPLS
  - Remove LDP from interfaces when all services migrated
  - Remove MPLS forwarding tables
  - Pure SRv6 operation

Coexistence (SR-MPLS to SRv6 interworking):
  Binding SID: Map MPLS domain to SRv6 domain
  At border routers, translate SR-MPLS labels to SRv6 SIDs
```

## Verify SRv6 Forwarding

```bash
# Check SRv6 local SIDs
show segment-routing srv6 sid detail

# Verify SRH insertion for traffic
sudo tcpdump -i eth0 -nn ip6 proto 43
# Proto 43 = IPv6 Routing extension header (SRH is Routing Type 4, RFC 8754)

# On Linux: verify SRv6 route
ip -6 route show | grep seg6

# Check SRv6 packet processing stats
cat /proc/net/ipv6_route | grep -v "^fe80"
ip -6 -s route show table all | grep srv6

# Trace SRv6 path (use tcpdump above to see SRH; traceroute itself
# does not display the SRH - inspect with tcpdump/wireshark)
traceroute6 2001:db8:destination::1
```

SRv6 migration from MPLS eliminates the need for LDP signaling and MPLS label management by encoding network instructions directly in IPv6 addresses, with End.DT6 SIDs replacing VPN labels for L3VPN, enabling a gradual migration where MPLS and SRv6 coexist during the transition period using binding SIDs for interworking.
