# How to Configure BGP IPv6 Route Maps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Route Maps, Policy, Routing

Description: Learn how to configure BGP IPv6 route maps to apply complex policies including LOCAL_PREF, MED, community tagging, and conditional route manipulation.

## Overview

Route maps are policy tools that can match BGP routes based on multiple criteria (prefix, community, AS path) and then set attributes like LOCAL_PREF, MED, and BGP communities. They are more powerful than prefix lists alone.

## Route Map Structure

```text
route-map <name> [permit|deny] <sequence-number>
 match [criteria]
 set [action]
```

A route map is evaluated in order. The first matching clause determines the action. If a route reaches the end of the route map without matching a permit clause, it is implicitly denied.

## FRRouting: Basic Route Map

```bash
vtysh
configure terminal

! Create a prefix list for matching
ipv6 prefix-list PREFERRED_PEER seq 10 permit 2001:db8:100::/48 le 64

! Create a route map to set LOCAL_PREF on preferred routes
route-map SET_LOCAL_PREF permit 10
 match ipv6 address prefix-list PREFERRED_PEER
 set local-preference 200     ! Higher = preferred in BGP selection

route-map SET_LOCAL_PREF permit 99
 ! Allow everything else with default local-preference

router bgp 65001
 address-family ipv6 unicast
  neighbor 2001:db8:1::2 route-map SET_LOCAL_PREF in
 exit-address-family

end
write memory
```

## Setting MED (Outbound)

MED influences which path an upstream neighbor uses to reach your network:

```bash
vtysh
configure terminal

! Match your own IPv6 prefixes before setting MED
ipv6 prefix-list MY_NETS seq 10 permit 2001:db8:200::/48

! Set MED on outbound routes to influence peer's return path
route-map SET_MED_OUT permit 10
 match ipv6 address prefix-list MY_NETS
 set metric 100    ! MED value - lower = preferred

route-map SET_MED_OUT permit 99
 ! Allow other routes to pass unchanged

router bgp 65001
 address-family ipv6 unicast
  neighbor 2001:db8:1::2 route-map SET_MED_OUT out
 exit-address-family

end
```

## Setting BGP Communities

```bash
vtysh
configure terminal

! Tag routes with a community for downstream filtering
route-map TAG_COMMUNITY permit 10
 set community 65001:100 additive   ! Add community, keep existing

! Match routes by community on inbound
bgp community-list standard MY_COMM permit 65001:100

route-map MATCH_COMMUNITY permit 10
 match community MY_COMM
 set local-preference 150

route-map MATCH_COMMUNITY permit 99
 set local-preference 100

router bgp 65001
 address-family ipv6 unicast
  neighbor 2001:db8:1::2 route-map TAG_COMMUNITY out
  neighbor 2001:db8:2::2 route-map MATCH_COMMUNITY in
 exit-address-family

end
```

## AS-Path Prepending (Traffic Engineering)

Make routes less preferred at a peer by prepending your own ASN:

```bash
vtysh
configure terminal

ipv6 prefix-list MY_NETS seq 10 permit 2001:db8:200::/48

route-map PREPEND_OUT permit 10
 match ipv6 address prefix-list MY_NETS
 set as-path prepend 65001 65001    ! Prepend twice to make path longer

route-map PREPEND_OUT permit 99
 ! Allow other routes to pass unchanged

router bgp 65001
 address-family ipv6 unicast
  neighbor 2001:db8:3::2 route-map PREPEND_OUT out
 exit-address-family

end
```

## Cisco IOS Route Maps for IPv6 BGP

```text
! Cisco - Route map with LOCAL_PREF
Router(config)# ipv6 prefix-list PREF_PEER seq 10 permit 2001:db8:100::/48 le 64

Router(config)# route-map SET_PREF permit 10
Router(config-route-map)#  match ipv6 address prefix-list PREF_PEER
Router(config-route-map)#  set local-preference 200

Router(config)# route-map SET_PREF permit 99

Router(config)# router bgp 65001
Router(config-router)# address-family ipv6 unicast
Router(config-router-af)#  neighbor 2001:db8:1::2 route-map SET_PREF in
```

## Verifying Route Map Application

```bash
# FRRouting: show route map hit counts

vtysh -c "show route-map SET_LOCAL_PREF"

# Check if routes from peer have correct LOCAL_PREF
vtysh -c "show bgp ipv6 unicast 2001:db8:100::/48"
# Look for: localpref 200
```

## Summary

BGP IPv6 route maps provide powerful per-route policy controls. Use them to set LOCAL_PREF for path preference, MED for outbound traffic engineering, communities for tagging and filtering, and AS-path prepending for de-preferencing backup links. Always have a catchall permit clause at the end to avoid accidentally denying all routes.
