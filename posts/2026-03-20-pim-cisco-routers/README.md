# How to Set Up PIM (Protocol Independent Multicast) on Cisco Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PIM, Multicast, Cisco, Routing, IGMP, Networking, RPS

Description: Configure PIM Sparse Mode and PIM Dense Mode on Cisco IOS routers to enable multicast routing, set up a Rendezvous Point, and verify multicast distribution trees.

## Introduction

PIM (Protocol Independent Multicast) is the routing protocol that builds multicast distribution trees between multicast sources and receivers. PIM is "protocol independent" because it uses the existing unicast routing table for RPF (Reverse Path Forwarding) checks rather than running its own routing algorithm. PIM-SM (Sparse Mode) is used for most enterprise deployments, using a Rendezvous Point (RP) to connect sources and receivers. PIM-DM (Dense Mode) floods first then prunes, suited for dense receiver populations.

## Enable PIM on Cisco IOS

```text
! Step 1: Enable IP multicast routing globally:
ip multicast-routing
! Some IOS XE platforms/releases also support the optional 'distributed' keyword

! Step 2: Enable PIM on each interface:
interface GigabitEthernet0/0
 ip pim sparse-mode
 ip pim query-interval 30    ! PIM hello/query interval (default 30s)

interface GigabitEthernet0/1
 ip pim sparse-mode

! Verify PIM is enabled:
show ip pim interface
! Output shows:
! Interface   PIM   Nbr   Query  DR       DR
!             Mode  Count Intvl  Prior    Address
! Gi0/0       SM    1     30     1        192.168.1.1

! Check PIM neighbors:
show ip pim neighbor
! Address         Interface       Uptime    Expires   Ver
! 192.168.1.2    Gi0/0          00:10:00  00:01:30  v2
```

## Configure Static Rendezvous Point (RP)

```text
! The RP is the meeting point for sources and receivers in PIM-SM

! Configure static RP (simplest method):
! On ALL routers in the PIM domain:
ip pim rp-address 192.168.100.1          ! RP for all groups

! RP for specific group ranges:
ip pim rp-address 192.168.100.1 224-groups
ip access-list standard 224-groups
 permit 239.0.0.0 0.255.255.255

! Verify RP configuration:
show ip pim rp mapping
! PIM Group-to-RP Mappings
! Group(s) 224.0.0.0/4, Static
!   RP 192.168.100.1 (?)

! On the RP router itself:
! The RP must have PIM enabled and be reachable via unicast
interface Loopback0
 ip address 192.168.100.1 255.255.255.255
 ip pim sparse-mode
```

## Configure Auto-RP (Dynamic RP Discovery)

```text
! Auto-RP uses two components:
! - RP Candidate: announces itself as RP
! - Mapping Agent: collects RP announcements and distributes

! On RP Candidate router:
ip pim send-rp-announce Loopback0 scope 16
! scope = TTL limit for RP announcements
! group-list optional: specify which groups this RP handles

ip pim send-rp-announce Loopback0 scope 16 group-list 224-acl
ip access-list standard 224-acl
 permit 239.0.0.0 0.255.255.255

! On Mapping Agent router:
ip pim send-rp-discovery Loopback0 scope 16

! Auto-RP needs either sparse-dense mode on transit interfaces, or
! 'ip pim autorp listener' globally while interfaces stay in sparse mode.
! One common option is sparse-dense mode:
interface GigabitEthernet0/0
 ip pim sparse-dense-mode

! Verify Auto-RP:
show ip pim rp mapping
! PIM Group-to-RP Mappings
! Group(s) 239.0.0.0/8
!   RP 192.168.100.1 (?), v2v1
!   Uptime: 00:15:00, expires: 00:02:30
```

## Verify PIM Multicast Routing

```text
! View multicast routing table:
show ip mroute
! (* 239.1.1.1) = Shared tree entry (via RP)
! (10.20.0.5, 239.1.1.1) = Source tree entry (shortest path)

! Example output:
! (* , 239.1.1.1), 00:02:00/00:03:00, RP 192.168.100.1, flags: S
!   Incoming interface: GigabitEthernet0/1, RPF nbr 192.168.100.1
!   Outgoing interface list:
!     GigabitEthernet0/0, Forward/Sparse, 00:02:00/00:01:30

! View active multicast groups:
show ip igmp groups
! IGMP Connected Group Membership
! Group Address  Interface   Uptime   Expires  Last Reporter
! 239.1.1.1      Gi0/0       00:05:00 00:03:00 192.168.1.10

! Verify RPF for a source:
show ip rpf 10.20.0.5
! RPF information for ? (10.20.0.5)
!   RPF interface: GigabitEthernet0/1
!   RPF neighbor: 10.0.0.1 (192.168.1.2)

! Check PIM register tunnel:
show ip pim tunnel
! Shows register tunnel from DR to RP
```

## Configure PIM Dense Mode

```text
! PIM Dense Mode: floods then prunes
! Good for: dense receiver networks, testing

! Enable PIM Dense Mode:
interface GigabitEthernet0/0
 ip pim dense-mode

! Dense mode has no RP:
! Source sends to group → flooded everywhere
! Routers with no receivers send prune messages
! Prune state maintained for 3 minutes, then re-floods

! View dense mode multicast table:
show ip mroute
! No (*,G) shared tree entries in PIM-DM
! Only (S,G) source trees

! View prune state:
show ip mroute 239.1.1.1 pruned
```

## Troubleshoot PIM Issues

```text
! PIM troubleshooting commands:

! Check all PIM interfaces and neighbors:
show ip pim interface detail
show ip pim neighbor

! Verify DR (Designated Router) election:
show ip pim interface GigabitEthernet0/0
! DR is elected per segment; highest priority wins, then highest IP if tied

! Debug PIM events (use carefully in production):
debug ip pim 239.1.1.1     ! Debug specific group
debug ip igmp              ! Debug IGMP join/leave

! Check multicast traffic statistics:
show ip mroute 239.1.1.1 count

! View multicast state for a group:
show ip mroute 239.1.1.1

! Ping a multicast group after configuring routers to join it with
! 'ip igmp join-group'; useful as a router-based reachability test:
ping 239.1.1.1
! This does not imply that arbitrary multicast receivers or hosts will reply
```

## Conclusion

PIM-SM is the standard multicast routing protocol for enterprise networks. Enable it with `ip multicast-routing` globally and `ip pim sparse-mode` on each interface. Configure a static RP with `ip pim rp-address` on all routers, or use Auto-RP for dynamic RP discovery. The RP must be reachable via unicast routing. Verify operation with `show ip mroute` (shows distribution trees), `show ip igmp groups` (shows active receivers), and `show ip pim neighbor` (shows PIM adjacencies). Use `ping <multicast-group>` only as a multicast reachability test when routers are configured to respond to multicast pings.
