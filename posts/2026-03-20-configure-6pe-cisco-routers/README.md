# How to Configure 6PE on Cisco Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, 6PE, Cisco, IOS, MPLS, BGP, Configuration

Description: Step-by-step configuration of 6PE (IPv6 Provider Edge) on Cisco IOS and IOS XE routers including MP-BGP IPv6 address family, MPLS enablement, and CE-PE peering.

---

6PE enables IPv6 transit over an IPv4 MPLS backbone. On Cisco IOS/IOS XE, configuration involves enabling MPLS on backbone interfaces, configuring MP-BGP with the IPv6 address family between PE routers, and peering with CE routers over IPv6.

## Lab Topology

```text
Lab Topology:
[CE1] ─── [PE1] ─── [P] ─── [PE2] ─── [CE2]
IPv6       10.0.0.1   10.0.0.3  10.0.0.2   IPv6
2001:db8:100::/48                       2001:db8:200::/48

MPLS LDP runs between PE1-P and P-PE2
MP-BGP IPv6 AF runs between PE1 and PE2
```

## Step 1: Enable MPLS on Backbone

```text
! PE1 - Enable LDP on backbone interface
!
ipv6 unicast-routing

mpls ldp router-id Loopback0 force

interface Loopback0
 ip address 10.0.0.1 255.255.255.255

interface GigabitEthernet0/0
 description To P-Router (MPLS Core)
 ip address 10.1.1.1 255.255.255.252
 ip ospf 1 area 0
 mpls ip
 no shutdown

! Verify MPLS is running
show mpls interfaces
show mpls ldp neighbor
show mpls ldp bindings
```

## Step 2: Configure IPv6 on PE-CE Interface

```text
! PE1 - Configure dual-stack interface toward CE1
interface GigabitEthernet0/1
 description To CE1 (IPv6 customer)
 ip address 192.168.1.1 255.255.255.252
 ipv6 address 2001:db8:10:1::1/64
 ipv6 enable
 no shutdown

! Verify
show ipv6 interface GigabitEthernet0/1
show ipv6 neighbors
```

## Step 3: Configure MP-BGP with IPv6 Address Family

```text
! PE1 - Configure MP-BGP for IPv6
router bgp 65000
 bgp router-id 10.0.0.1
 bgp log-neighbor-changes
 no bgp default ipv4-unicast

 ! iBGP peer with PE2 (over IPv4)
 neighbor 10.0.0.2 remote-as 65000
 neighbor 10.0.0.2 update-source Loopback0
 neighbor 10.0.0.2 description PE2-iBGP-6PE

 ! IPv6 address family for 6PE
 address-family ipv6
  neighbor 10.0.0.2 activate
  neighbor 10.0.0.2 send-community
  neighbor 10.0.0.2 send-label
 exit-address-family

! PE1 - BGP peering with CE1 (IPv6 eBGP)
router bgp 65000
 neighbor 2001:db8:10:1::2 remote-as 65001
 neighbor 2001:db8:10:1::2 description CE1-eBGP
 address-family ipv6
  ! CE1 peering
  neighbor 2001:db8:10:1::2 activate
 exit-address-family
```

## Step 4: Configure CE Routers

```text
! CE1 - Customer edge router
ipv6 unicast-routing

interface GigabitEthernet0/0
 description To PE1
 ipv6 address 2001:db8:10:1::2/64
 ipv6 enable
 no shutdown

! CE1 BGP
router bgp 65001
 bgp router-id 192.168.10.1
 no bgp default ipv4-unicast
 neighbor 2001:db8:10:1::1 remote-as 65000
 neighbor 2001:db8:10:1::1 description PE1

 address-family ipv6
  neighbor 2001:db8:10:1::1 activate
  ! Advertise customer prefix
  network 2001:db8:100::/48
 exit-address-family

! CE1 - Configure customer IPv6 prefix
ipv6 route 2001:db8:100::/48 Null0
```

## Step 5: Verify 6PE

```text
! Check MP-BGP IPv6 neighbors
show bgp ipv6 unicast summary
! Should show: PE2 iBGP neighbor, State = Established
! Should show: CE1 eBGP neighbor, State = Established

! View IPv6 routes with MPLS labels
show bgp ipv6 unicast 2001:db8:200::/48
! Look for:
! *>i 2001:db8:200::/48  ::FFFF:10.0.0.2 ...
!    ... mpls label <label-number>

! View label bindings advertised by BGP
show bgp ipv6 unicast labels
! Look for the remote prefix with an IPv4-mapped IPv6 next hop and an outgoing label

! Verify MPLS forwarding entry
show mpls forwarding-table
! Should show an IPv6 aggregate/label entry associated with the remote 6PE next hop

! Check IPv6 routing table
show ipv6 route
! B  2001:db8:200::/48 [200/0]
!    via ::FFFF:10.0.0.2, IPv6-mpls

! Test end-to-end
ping ipv6 2001:db8:200::1 source 2001:db8:10:1::2
traceroute ipv6 2001:db8:200::1 source 2001:db8:10:1::2

! Debug (if issues)
debug bgp ipv6 unicast updates
show bgp ipv6 unicast 2001:db8:200::/48
```

## Troubleshoot Common 6PE Issues

```text
1. BGP neighbor not establishing:
show bgp ipv6 unicast summary → check state
! Fix: Ensure neighbor is using update-source Loopback0
! Fix: Verify no ACL blocking TCP 179 between PE loopbacks

2. Routes not being advertised from the CE:
show bgp ipv6 unicast → check for "network not in table"
! Fix: Add null route for summary on the CE: ipv6 route 2001:db8:100::/48 Null0

3. Packets not labeled (MPLS not working):
show mpls forwarding-table → check for IPv6 entries
! Fix: Verify "mpls ip" on all backbone interfaces
! Fix: Check LDP sessions: show mpls ldp neighbor

4. Next-hop unreachable:
show bgp ipv6 unicast → check next-hop attribute
! The next-hop is an IPv4-mapped IPv6 address: ::ffff:10.0.0.2
! Fix: Ensure the remote PE loopback is reachable in the IPv4 IGP and labeled by LDP across the MPLS core
```

6PE on Cisco IOS requires MPLS LDP on backbone interfaces, MP-BGP with the IPv6 address family between PE routers (using IPv4 loopbacks as BGP peers and `neighbor ... send-label` for labeled IPv6 routes), and IPv6 interfaces on PE-CE links, with the key insight that BGP next-hops use IPv4-mapped IPv6 addresses to embed PE IPv4 addresses for MPLS label resolution.
