# How to Configure IPv6 for Leaf-Spine Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Leaf-Spine, Data Center, BGP, ECMP, Clos, Fabric

Description: Configure IPv6 in a leaf-spine data center fabric using BGP as the underlay protocol, including eBGP peering between tiers, ECMP load balancing, and anycast gateway for server workloads.

---

Leaf-spine (Clos) architecture is the standard modern data center fabric design. IPv6 leaf-spine uses eBGP for underlay routing with unique AS numbers per leaf, ECMP across all spine uplinks, and distributed anycast gateway for Layer 3 forwarding at the leaf level.

## Leaf-Spine IPv6 BGP Topology

```text
Leaf-Spine IPv6 BGP Design:
                AS 65001      AS 65002
                [Spine-1]    [Spine-2]
               /    |    \   /    |    \
    AS 65101  /  AS 65102 \ / AS 65103  \
          [Leaf-1]  [Leaf-2]  [Leaf-3]
             |          |         |
          Servers    Servers   Servers

eBGP Peering:
- Each leaf has unique ASN (65101-65199)
- Each spine has unique ASN (65001-65002)
- Every leaf peers with every spine (full mesh up/down)
- ECMP: Traffic load-balances across all uplinks
```

## Leaf Switch BGP Configuration (Arista EOS)

```text
! Leaf-1 (AS 65101) - Arista EOS configuration

ipv6 unicast-routing

! Loopback for router-id and overlay
interface Loopback0
   ipv6 address 2001:db8:dc1:200::101/128

! Uplinks to Spine-1 and Spine-2
interface Ethernet1
   description Spine-1-Uplink
   no switchport
   ipv6 address 2001:db8:dc1:300:1:101::1/127

interface Ethernet2
   description Spine-2-Uplink
   no switchport
   ipv6 address 2001:db8:dc1:300:2:101::1/127

! BGP underlay
router bgp 65101
   router-id 10.0.1.101
   maximum-paths 64   ! ECMP
   !
   ! Spine-1 BGP peer
   neighbor 2001:db8:dc1:300:1:101::0 remote-as 65001
   neighbor 2001:db8:dc1:300:1:101::0 description Spine-1
   neighbor 2001:db8:dc1:300:1:101::0 bfd
   !
   ! Spine-2 BGP peer
   neighbor 2001:db8:dc1:300:2:101::0 remote-as 65002
   neighbor 2001:db8:dc1:300:2:101::0 description Spine-2
   neighbor 2001:db8:dc1:300:2:101::0 bfd
   !
   ! Address family IPv6
   address-family ipv6
      network 2001:db8:dc1:200::101/128  ! Advertise loopback
      !
      ! Spine-1 BGP peer
      neighbor 2001:db8:dc1:300:1:101::0 activate
      !
      ! Spine-2 BGP peer
      neighbor 2001:db8:dc1:300:2:101::0 activate
```

## Spine Switch BGP Configuration (Arista EOS)

```text
! Spine-1 (AS 65001) - BGP configuration

ipv6 unicast-routing

interface Loopback0
   ipv6 address 2001:db8:dc1:100::1/128

! All leaf uplinks
interface Ethernet1
   description Leaf-1-Downlink
   no switchport
   ipv6 address 2001:db8:dc1:300:1:101::0/127

interface Ethernet2
   description Leaf-2-Downlink
   no switchport
   ipv6 address 2001:db8:dc1:300:1:102::0/127

router bgp 65001
   router-id 10.0.0.1
   maximum-paths 64
   neighbor 2001:db8:dc1:300:1:101::1 remote-as 65101
   neighbor 2001:db8:dc1:300:1:102::1 remote-as 65102

   address-family ipv6
      network 2001:db8:dc1:100::1/128

      ! Leaf-1 peer
      neighbor 2001:db8:dc1:300:1:101::1 activate
      neighbor 2001:db8:dc1:300:1:101::1 route-map LEAF-IN in

      ! Leaf-2 peer
      neighbor 2001:db8:dc1:300:1:102::1 activate
      neighbor 2001:db8:dc1:300:1:102::1 route-map LEAF-IN in

! Don't accept default or broad prefixes from leaves
route-map LEAF-IN permit 10
   match ipv6 address prefix-list ALLOWED-PREFIXES

ipv6 prefix-list ALLOWED-PREFIXES
   seq 10 permit 2001:db8:dc1:200::/56 le 128
   seq 20 permit 2001:db8:dc1:2000::/52 le 64
```

## Anycast Gateway for Server IPv6

```text
! Distributed anycast gateway: same virtual IPv6 gateway on all leaves
! Servers get one gateway IP regardless of which leaf they're on

! On each leaf:
ip virtual-router mac-address 001c.7300.0999

! On Leaf-1:
interface Vlan100
   description App-Tier
   ipv6 address 2001:db8:dc1:2001::2/64
   ipv6 virtual-router address 2001:db8:dc1:2001::1

! On Leaf-2 (same virtual IP!):
interface Vlan100
   description App-Tier
   ipv6 address 2001:db8:dc1:2001::3/64
   ipv6 virtual-router address 2001:db8:dc1:2001::1

! Server configuration:
# Default gateway: 2001:db8:dc1:2001::1

# Works regardless of which leaf the server connects to
# No default-gateway change when a VM moves within the same stretched subnet
```

## ECMP Verification for IPv6

```bash
# Verify ECMP paths for IPv6
# Arista EOS:
show ipv6 route 2001:db8:dc1:200::102/128
# Should show: multiple nexthops (one per spine)
# Via 2001:db8:dc1:300:1:101::0 [20/0]
# Via 2001:db8:dc1:300:2:101::0 [20/0]

# Cisco Nexus:
show ipv6 route 2001:db8:dc1:200::102/128 | include via
# via 2001:db8:dc1:300:1:101::0, [20/0], ...
# via 2001:db8:dc1:300:2:101::0, [20/0], ...

# Check the BGP control plane for multiple paths
show ipv6 bgp 2001:db8:dc1:200::102/128 detail
# Should show multiple BGP paths for the prefix

# Monitor ECMP traffic distribution
show interfaces ethernet 1-2 counters rates
# Both uplinks should show similar utilization
```

## BFD for Fast Failure Detection

```text
! Configure BFD on spine-leaf BGP sessions
! Arista EOS:

interface Ethernet1
   bfd interval 300 min-rx 300 multiplier 3

interface Ethernet2
   bfd interval 300 min-rx 300 multiplier 3

router bgp 65101
   neighbor 2001:db8:dc1:300:1:101::0 bfd
   neighbor 2001:db8:dc1:300:2:101::0 bfd

! 300ms interval, detect failure in 900ms
```

IPv6 leaf-spine architecture uses eBGP with unique ASNs per leaf device for scalable underlay routing, ECMP across all spine uplinks for bandwidth aggregation, distributed anycast gateways on leaf VLAN interfaces for server default routing, and BFD on all BGP sessions to achieve sub-second failover when a spine or uplink fails.
