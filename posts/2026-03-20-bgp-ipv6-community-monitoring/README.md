# How to Monitor BGP IPv6 Community Propagation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Communities, Monitoring, Looking Glass

Description: Monitor how BGP communities propagate through IPv6 routes across your network using looking glass tools and BGP data collectors.

## Overview

Monitor how BGP communities propagate through IPv6 routes across your network using looking glass tools and BGP data collectors.

## BGP Communities and IPv6

BGP communities are attributes attached to route announcements that carry policy signaling information. They work identically for IPv4 and IPv6 prefixes.

## Standard Community Format

Standard BGP communities (RFC 1997) are 32-bit values written as two 16-bit numbers, commonly shown as `ASN:value`:
```text
ASN:value
65000:100    # Example community
65001:200    # Another example community
```

## BIRD2 Configuration Example

```text
# /etc/bird/bird.conf

# Define community functions

function set_local_pref(int pref) {
    bgp_local_pref = pref;
}

# Filter for IPv6 routes with communities
filter ipv6_community_policy {
    # Honor upstream community signals for local preference
    if (65001, 100) ~ bgp_community then {
        set_local_pref(200);  # High preference
        accept;
    }
    if (65001, 200) ~ bgp_community then {
        set_local_pref(50);   # Low preference
        accept;
    }
    accept;
}

protocol bgp upstream {
    local as 64496;
    neighbor 2001:db8:1::1 as 65001;
    ipv6 {
        import filter ipv6_community_policy;
        export filter { accept; };
    };
}
```

## FRRouting Community Configuration

```text
# FRR vtysh configuration
router bgp 64496
  neighbor 2001:db8:1::1 remote-as 65001
  address-family ipv6 unicast
    neighbor 2001:db8:1::1 activate
    neighbor 2001:db8:1::1 route-map COMMUNITY-POLICY in

# Route map with community matching
route-map COMMUNITY-POLICY permit 10
  match community MY-COMMUNITIES
  set local-preference 200
route-map COMMUNITY-POLICY permit 20

# Define community list
bgp community-list standard MY-COMMUNITIES permit 65001:100
```

## Cisco IOS Community Configuration

```text
! Configure community for IPv6 BGP
ip bgp-community new-format

router bgp 64496
  neighbor 2001:db8:1::1 remote-as 65001
  address-family ipv6 unicast
    neighbor 2001:db8:1::1 activate
    neighbor 2001:db8:1::1 route-map COMMUNITY-INBOUND in

! Route map
route-map COMMUNITY-INBOUND permit 10
  match community 100
  set local-preference 200
route-map COMMUNITY-INBOUND permit 20

! Community list
ip community-list 100 permit 65001:100
```

## Testing Community Propagation

```bash
# Check if communities are present on IPv6 routes in BIRD
birdc "show route for 2001:db8::/32 all"

# In FRR
vtysh -c "show bgp ipv6 unicast 2001:db8::/32"

# Look for community attribute in output
# Example: Community: 65001:100 65001:200

# Use RIPEstat's BGP State API for external verification
curl "https://stat.ripe.net/data/bgp-state/data.json?resource=2001:db8::/32" | jq '.data.bgp_state[].community'
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor the availability and response time of services that depend on your IPv6 BGP paths. Unexpected reachability changes can indicate routing issues, but use router-native BGP telemetry to monitor session state and prefix counts.

## Conclusion

BGP communities work identically for IPv6 prefixes - you configure them in the same route maps and community lists. Always verify community propagation using BGP looking glasses and test policy changes in a lab environment before applying to production IPv6 BGP sessions.
