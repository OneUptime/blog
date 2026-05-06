# How to Use BGP Large Communities for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Large Communities, RFC 8092, Routing

Description: Implement BGP large communities (RFC 8092) for hierarchical IPv6 routing policies across AS boundaries.

## Overview

Implement BGP large communities (RFC 8092) for hierarchical IPv6 routing policies across AS boundaries.

## BGP Large Communities and IPv6

BGP large communities are optional transitive path attributes attached to route announcements that carry policy signaling information. They work identically for IPv4 and IPv6 prefixes.

## Large Community Format

BGP large communities (RFC 8092) are 96-bit values written as three 32-bit numbers:
Unlike standard communities, there are no well-known large communities.
```text
Global Administrator:Local Data 1:Local Data 2
65001:100:1    # High preference signal
65001:200:1    # Low preference signal
```

## BIRD2 Configuration Example

```text
# /etc/bird/bird.conf

# Define community functions

function set_local_pref(int pref) {
    bgp_local_pref = pref;
}

# Filter for IPv6 routes with large communities
filter ipv6_large_community_policy {
    # Honor upstream large community signals for local preference
    if (65001, 100, 1) ~ bgp_large_community then {
        set_local_pref(200);  # High preference
        accept;
    }
    if (65001, 200, 1) ~ bgp_large_community then {
        set_local_pref(50);   # Low preference
        accept;
    }
    accept;
}

protocol bgp upstream {
    local 2001:db8:1::2 as 64496;
    neighbor 2001:db8:1::1 as 65001;
    ipv6 {
        import filter ipv6_large_community_policy;
        export filter { accept; };
    };
}
```

## FRRouting Large Community Configuration

```bash
# FRR vtysh configuration
router bgp 64496
  neighbor 2001:db8:1::1 remote-as 65001
  address-family ipv6 unicast
    neighbor 2001:db8:1::1 activate
    neighbor 2001:db8:1::1 route-map LARGE-COMMUNITY-IN in

# Route map with large community matching
route-map LARGE-COMMUNITY-IN permit 10
  match large-community 65001:100:1
  set local-preference 200

route-map LARGE-COMMUNITY-IN permit 20
  match large-community 65001:200:1
  set local-preference 50

route-map LARGE-COMMUNITY-IN permit 30
```

## Cisco IOS Large Community Configuration

```text
! Configure large community policy for IPv6 BGP
router bgp 64496
  neighbor 2001:db8:1::1 remote-as 65001
  address-family ipv6 unicast
    neighbor 2001:db8:1::1 activate
    neighbor 2001:db8:1::1 route-map LARGE-COMMUNITY-IN in

! Route map
route-map LARGE-COMMUNITY-IN permit 10
  match large-community LARGE-COMMUNITY-HIGH
  set local-preference 200

route-map LARGE-COMMUNITY-IN permit 20
  match large-community LARGE-COMMUNITY-LOW
  set local-preference 50

route-map LARGE-COMMUNITY-IN permit 30

! Large community lists
ip large-community-list standard LARGE-COMMUNITY-HIGH permit 65001:100:1
ip large-community-list standard LARGE-COMMUNITY-LOW permit 65001:200:1
```

## Testing Large Community Propagation

```bash
# Check if large communities are present on IPv6 routes in BIRD
birdc "show route for <your-prefix> all"

# In FRR
vtysh -c "show bgp ipv6 unicast <your-prefix>"

# Look for a Large Community / BGP.large_community attribute in the output
# Example: Large Community: 65001:100:1 65001:200:1

# Use RIPE RIS looking glass for external verification
curl "https://stat.ripe.net/data/looking-glass/data.json?resource=<your-announced-prefix>" | jq '.data.rrcs[].peers[] | {prefix, largeCommunity}'
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor IPv6 reachability for your BGP peers and alert on exported BGP metrics such as session state and prefix counts. Unexpected drops in prefix counts may indicate large-community-based filtering is rejecting your routes.

## Conclusion

BGP large communities work identically for IPv6 prefixes - you configure them in the same policies and large-community lists. Always verify large community propagation using router CLI output or BGP looking glasses and test policy changes in a lab environment before applying them to production IPv6 BGP sessions.
