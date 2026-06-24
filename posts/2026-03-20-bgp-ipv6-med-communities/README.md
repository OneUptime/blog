# How to Configure BGP IPv6 MED with Communities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, MED, BGP Attributes, Routing Policy

Description: Use BGP communities to signal and apply MED (Multi-Exit Discriminator) values for IPv6 route selection between multiple connections.

## Overview

Use BGP communities to signal and apply MED (Multi-Exit Discriminator) values for IPv6 route selection between multiple connections to the same neighboring AS.

## BGP Communities and IPv6

BGP communities are attributes attached to route announcements that carry policy signaling information. They work identically for IPv4 and IPv6 prefixes.

## Standard Community Format

Standard BGP communities (RFC 1997) are 32-bit values written as two 16-bit numbers:
```text
ASN:value
65000:100    # Example community
65001:200    # Another custom community
```

## BIRD2 Configuration Example

```text
# /etc/bird/bird.conf

function set_med(int med) {
    bgp_med = med;
}

# Filter for IPv6 routes with communities
filter ipv6_community_policy {
    # Lower MED is preferred when comparing routes from the same neighboring AS
    if (65001, 100) ~ bgp_community then {
        set_med(50);
        accept;
    }
    if (65001, 200) ~ bgp_community then {
        set_med(200);
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

```bash
# FRR vtysh configuration
router bgp 64496
  neighbor 2001:db8:1::1 remote-as 65001
  address-family ipv6 unicast
    neighbor 2001:db8:1::1 activate
    neighbor 2001:db8:1::1 route-map COMMUNITY-POLICY in
  exit-address-family

# Route map with community matching
route-map COMMUNITY-POLICY permit 10
  match community MED-LOW
  set metric 50
route-map COMMUNITY-POLICY permit 20
  match community MED-HIGH
  set metric 200
route-map COMMUNITY-POLICY permit 30

# Define community list
ip community-list standard MED-LOW permit 65001:100
ip community-list standard MED-HIGH permit 65001:200
```

## Cisco IOS Community Configuration

```text
! Configure community for IPv6 BGP
router bgp 64496
  neighbor 2001:DB8:1::1 remote-as 65001
  address-family ipv6 unicast
    neighbor 2001:DB8:1::1 activate
    neighbor 2001:DB8:1::1 route-map COMMUNITY-INBOUND in

! Route map
route-map COMMUNITY-INBOUND permit 10
  match community 10
  set metric 50
route-map COMMUNITY-INBOUND permit 20
  match community 20
  set metric 200
route-map COMMUNITY-INBOUND permit 30

! Community list
ip community-list 10 permit 65001:100
ip community-list 20 permit 65001:200
```

## Testing Community Propagation

```bash
# Check if communities are present on IPv6 routes in BIRD
birdc "show route for 2001:db8::/32 all"

# In FRR
vtysh -c "show bgp ipv6 unicast 2001:db8::/32"

# Look for both community and MED/metric attributes in output
# Example: Community: 65001:100

# Use RIPEstat for external verification
# Replace YOUR_IPV6_PREFIX with your announced prefix
curl "https://stat.ripe.net/data/bgp-state/data.json?resource=YOUR_IPV6_PREFIX" | jq '.data.bgp_state[].community'
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor BGP session health for your IPv6 peers and track route counts. Unexpected drops in prefix counts may indicate community-based filtering is rejecting your routes.

## Conclusion

BGP communities work identically for IPv6 prefixes, but MED is normally compared only among routes learned from the same neighboring AS. Always verify community propagation and the resulting MED using BGP looking glasses and test policy changes in a lab environment before applying them to production IPv6 BGP sessions.
