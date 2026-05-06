# How to Configure BGP IPv6 for Internet Exchange Points (IXPs)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, IXP, Internet Exchange, Peering

Description: Learn how to configure BGP IPv6 for peering at Internet Exchange Points, including BIRD route server configuration and multi-lateral peering policies.

## Overview

Internet Exchange Points (IXPs) are physical locations where networks exchange traffic. At an IXP, participants peer via BGP over a shared switching fabric, often using route servers to simplify multi-lateral peering. IPv6 peering at IXPs uses the same shared switching fabric as IPv4, but on the IXP's IPv6 peering LAN.

## IXP BGP Architecture

```mermaid
graph TD
    IXP_LAN[IXP Peering LAN - 2001:db8:100::/64] --> RS1[Route Server 1]
    IXP_LAN --> RS2[Route Server 2]
    IXP_LAN --> AS65001[Member AS 65001]
    IXP_LAN --> AS65002[Member AS 65002]
    IXP_LAN --> AS65003[Member AS 65003]
    RS1 -.->|Redistributes routes| AS65001
    RS1 -.->|Redistributes routes| AS65002
    AS65001 -.->|Direct bilateral session| AS65002
```

## Participant Configuration (FRRouting)

```bash
vtysh
configure terminal

ipv6 prefix-list MY_PREFIXES seq 5 permit 2001:db8:1000::/48

router bgp 65001
 bgp router-id 1.1.1.1
 no bgp default ipv4-unicast

 ! Peer with IXP Route Server 1
 neighbor 2001:db8:100::10 remote-as 65500
 neighbor 2001:db8:100::10 description "IXP Route Server 1"

 ! Peer with IXP Route Server 2
 neighbor 2001:db8:100::11 remote-as 65500
 neighbor 2001:db8:100::11 description "IXP Route Server 2"

 ! Direct bilateral peer (no route server)
 neighbor 2001:db8:100::22 remote-as 65002
 neighbor 2001:db8:100::22 description "Direct Peer AS65002"

 ! Route servers typically do not prepend their own ASN to AS_PATH
 no neighbor 2001:db8:100::10 enforce-first-as
 no neighbor 2001:db8:100::11 enforce-first-as

 address-family ipv6 unicast

  ! Activate neighbors
  neighbor 2001:db8:100::10 activate
  neighbor 2001:db8:100::11 activate
  neighbor 2001:db8:100::22 activate

  ! Only advertise our own prefix to the route server
  neighbor 2001:db8:100::10 prefix-list MY_PREFIXES out
  neighbor 2001:db8:100::11 prefix-list MY_PREFIXES out

  ! Our network to advertise
  network 2001:db8:1000::/48

 exit-address-family

end
write memory
```

## Route Server Configuration (BIRD)

```conf
# /etc/bird/bird.conf - IXP Route Server configuration

router id 192.0.2.1;
log syslog all;

protocol device { scan time 10; }

# Define import filter - reject default route and obvious bogons

filter IMPORT_FROM_MEMBER {
    # Reject default route
    if net = ::/0 then reject;
    # Reject bogons
    if net ~ [ fc00::/7+, fe80::/10+, ff00::/8+ ] then reject;
    # Accept remaining prefixes
    accept;
}

# Template for route server clients
template bgp RS_CLIENT {
    local 2001:db8:100::10 as 65500;
    rs client;         # This is a route server client session
    ipv6 {
        import filter IMPORT_FROM_MEMBER;
        export all;    # Send all valid routes to this member
    };
}

# Member AS 65001
protocol bgp AS65001 from RS_CLIENT {
    neighbor 2001:db8:100::21 as 65001;
    description "Member AS65001";
}

# Member AS 65002
protocol bgp AS65002 from RS_CLIENT {
    neighbor 2001:db8:100::22 as 65002;
}
```

## IXP Best Practices for IPv6

1. **Accept only announced prefixes** - Use IRR-based filtering to accept only prefixes the AS is authorized to announce
2. **Enforce RPKI ROV** - Reject routes with invalid RPKI Route Origin Validation status
3. **Use maximum-prefix limits** - Prevent members from accidentally advertising too many routes
4. **Advertise only prefixes you originate or are authorized to announce** - Do not leak unrelated learned routes back to the IXP fabric

## RPKI Validation in FRRouting

```bash
vtysh
configure terminal

! Requires FRR RPKI support and bgpd started with -M rpki
! Configure RPKI cache validator
rpki
 rpki cache tcp 192.0.2.10 3323 preference 1
 exit

route-map RPKI-IN deny 10
 match rpki invalid
!
route-map RPKI-IN permit 20

router bgp 65001
 address-family ipv6 unicast
  neighbor 2001:db8:100::10 activate
  neighbor 2001:db8:100::10 soft-reconfiguration inbound
  neighbor 2001:db8:100::10 route-map RPKI-IN in
  neighbor 2001:db8:100::11 activate
  neighbor 2001:db8:100::11 soft-reconfiguration inbound
  neighbor 2001:db8:100::11 route-map RPKI-IN in
 exit-address-family

end

! Check RPKI validation state of routes
vtysh -c "show bgp ipv6 unicast rpki valid"
```

## Summary

IXP IPv6 BGP peering uses the IXP's shared peering LAN IPv6 addresses. Participants peer with route servers using standard BGP IPv6 configuration. Route servers redistribute prefixes between members. Always apply IRR-based prefix filtering and RPKI validation, advertise only prefixes you are authorized to announce, and use maximum-prefix limits as a safety measure.
