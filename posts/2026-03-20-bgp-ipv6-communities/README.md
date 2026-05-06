# How to Configure BGP IPv6 Communities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Communities, Route Policy, Networking

Description: Learn how to configure and use BGP communities in IPv6 routing for traffic engineering, filtering, and inter-AS coordination.

## Overview

BGP communities are optional attributes attached to route updates that carry policy information. They are extensively used for traffic engineering, route filtering, and inter-AS coordination. IPv6 BGP uses the same community mechanisms as IPv4.

## Community Types

| Type | Format | Example | RFC |
|------|--------|---------|-----|
| Standard | 2-octet-ASN:value (4 bytes) | 65001:100 | RFC 1997 |
| Extended | Type:Administrator:value (8 bytes) | rt:65001:100 | RFC 4360 |
| Large | GlobalAdmin:LocalData1:LocalData2 (12 bytes) | 65001:100:200 | RFC 8092 |

## Well-Known Communities

| Community | Action |
|-----------|--------|
| `no-export` | Do not advertise outside a BGP confederation boundary |
| `no-advertise` | Do not advertise to any BGP peer |
| `local-AS` | Do not advertise to external BGP peers, including confederation eBGP peers |
| `internet` | General Internet community; matches all routes by default |

## Setting Communities on FRRouting

```bash
vtysh
configure terminal

! Set community on outbound routes to peer
route-map SET_COMMUNITY_OUT permit 10
 match ipv6 address prefix-list MY_PREFIXES
 set community 65001:100 65001:200 additive   ! Add communities

! Alternative: tag routes with no-export while preserving existing communities
route-map NO_EXPORT_TAG permit 10
 set community no-export additive

router bgp 65001
 address-family ipv6 unicast
  neighbor 2001:db8:1::2 route-map SET_COMMUNITY_OUT out
  neighbor 2001:db8:1::2 send-community standard   ! Explicit; enabled by default in current FRR releases
 exit-address-family

end
write memory
```

## Matching Communities on Inbound

```bash
vtysh
configure terminal

! Create a community list for matching
bgp community-list standard PREF_COMMUNITY permit 65002:200

! Route map: set LOCAL_PREF for routes tagged with a specific community
route-map PROCESS_COMMUNITY permit 10
 match community PREF_COMMUNITY
 set local-preference 200

route-map PROCESS_COMMUNITY permit 99
 set local-preference 100

router bgp 65001
 address-family ipv6 unicast
  neighbor 2001:db8:1::2 route-map PROCESS_COMMUNITY in
 exit-address-family

end
```

## Large Communities (RFC 8092)

Large communities are 12 bytes (3 x 4-byte fields) and avoid the 2-octet ASN limitation of standard communities:

```bash
! Use large communities for 4-byte ASN environments
route-map SET_LARGE_COMMUNITY permit 10
 set large-community 131072:100:1 additive

route-map MATCH_LARGE_COMMUNITY permit 10
 match large-community 131072:100:1
 set local-preference 150
```

## IXP Community Usage Example

IXPs often publish operator-defined communities for traffic engineering:

```bash
! Example: Accept routes tagged by peer with their community
! 65002:100 = "customer routes" - prefer these
! 65002:200 = "peer routes" - normal preference
! 65002:300 = "upstream routes" - lower preference

bgp community-list standard CUSTOMER_ROUTES permit 65002:100
bgp community-list standard PEER_ROUTES     permit 65002:200
bgp community-list standard UPSTREAM_ROUTES permit 65002:300

route-map PROCESS_IXP_ROUTES permit 10
 match community CUSTOMER_ROUTES
 set local-preference 200

route-map PROCESS_IXP_ROUTES permit 20
 match community PEER_ROUTES
 set local-preference 150

route-map PROCESS_IXP_ROUTES permit 30
 match community UPSTREAM_ROUTES
 set local-preference 100

route-map PROCESS_IXP_ROUTES permit 99
 set local-preference 100
```

## Verifying Communities

```bash
# Show communities on received routes

vtysh -c "show bgp ipv6 unicast detail-routes" | grep Community

# Show detail for a specific route including communities
vtysh -c "show bgp ipv6 unicast 2001:db8:100::/48"
# Look for: Community: 65002:100 65002:200
```

## Summary

BGP communities are 32-bit (standard) or larger tags attached to route updates to convey policy intent. Use `set community` or `set large-community` in route maps to tag routes, `bgp community-list` or `match large-community` to match policy values, and `send-community` with the appropriate option when you want FRRouting to send them explicitly. Always coordinate community assignments with your peers for consistent policy enforcement.
