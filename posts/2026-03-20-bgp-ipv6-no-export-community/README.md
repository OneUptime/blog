# How to Configure BGP IPv6 No-Export Community

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Communities, No-Export, Policy

Description: Use the BGP no-export community to prevent IPv6 prefixes from being advertised beyond the local AS boundary.

## Overview

Use the BGP no-export community to prevent IPv6 prefixes from being advertised beyond the local AS or BGP confederation boundary.

## BGP Communities and IPv6

BGP communities are attributes attached to route announcements that carry policy signaling information. They work identically for IPv4 and IPv6 prefixes, including the well-known `no-export` community defined in RFC 1997.

## Standard Community Format

Standard BGP communities (RFC 1997) are 32-bit values often written as two 16-bit numbers. Well-known communities such as `no-export` are reserved values and are usually configured by name:
```text
ASN:value
65001:100    # Custom standard community
65001:200    # Custom standard community
no-export    # Well-known community (0xFFFFFF01)
```

## BIRD2 Configuration Example

```javascript
# /etc/bird/bird.conf

# Filter for IPv6 routes that should not leave the local AS
filter ipv6_no_export_policy {
    bgp_community.add((65535, 65281));  # no-export
    accept;
}

protocol bgp upstream {
    local as 64496;
    neighbor 2001:db8:1::1 as 65001;
    ipv6 {
        import all;
        export filter ipv6_no_export_policy;
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
    neighbor 2001:db8:1::1 route-map NO-EXPORT-OUT out
    neighbor 2001:db8:1::1 send-community standard

# Route map to attach no-export
route-map NO-EXPORT-OUT permit 10
  set community additive no-export
```

## Cisco IOS Community Configuration

```text
! Configure no-export for IPv6 BGP
router bgp 64496
  neighbor 2001:db8:1::1 remote-as 65001
  address-family ipv6 unicast
    neighbor 2001:db8:1::1 activate
    neighbor 2001:db8:1::1 route-map NO-EXPORT-OUT out
    neighbor 2001:db8:1::1 send-community standard

! Route map
route-map NO-EXPORT-OUT permit 10
  set community no-export
```

## Testing Community Propagation

```bash
# Check if communities are present on IPv6 routes in BIRD
birdc "show route 2001:db8:100::/48 all"

# In FRR
vtysh -c "show bgp ipv6 unicast 2001:db8:100::/48"

# Look for the no-export community in output

# Use RIPE Stat for external verification
# A properly tagged no-export route should normally not appear on public RIS collectors
curl "https://stat.ripe.net/data/bgp-state/data.json?resource=YOUR_PUBLIC_IPV6_PREFIX" | jq '.data.nr_routes'
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor BGP session health for your IPv6 peers and track route counts. Unexpected drops in prefix counts may indicate community-based filtering is rejecting your routes.

## Conclusion

The `no-export` community works the same way for IPv6 prefixes as it does for IPv4. Always verify that the `no-export` community is present on the routes you expect, and test policy changes in a lab environment before applying them to production IPv6 BGP sessions.
