# How to Configure BGP IPv6 Blackhole Community

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Blackhole, DDoS, Security

Description: Configure BGP blackhole community (65535:666) for IPv6 prefixes to trigger upstream DDoS mitigation at provider networks.

## Overview

Configure the BLACKHOLE BGP community (65535:666) on IPv6 prefixes so upstreams that honor RFC 7999 can discard traffic during a DDoS event.

## BGP Communities and IPv6

BGP communities are attributes attached to route announcements that carry policy signaling information. The same standard community attribute is used for both IPv4 and IPv6 prefixes. RFC 7999 defines the well-known `BLACKHOLE` community as `65535:666`.

## Standard Community Format

Standard BGP communities (RFC 1997) are 32-bit values written as two 16-bit numbers:
```text
ASN:value
65535:666    # BLACKHOLE well-known community (RFC 7999)
65001:200    # Example private-use community
```

## BIRD2 Configuration Example

```text
# /etc/bird/bird.conf

protocol static blackhole_v6 {
    ipv6;
    route 2001:db8:dead:beef::1/128 blackhole;
}

# Export only the host route being blackholed and attach RFC 7999
filter ipv6_blackhole_export {
    if net ~ [ 2001:db8:dead:beef::1/128 ] then {
        bgp_community.add((65535, 666));
        accept;
    }
    reject;
}

protocol bgp upstream {
    local as 64496;
    neighbor 2001:db8:100::1 as 65001;
    ipv6 {
        import all;
        export filter ipv6_blackhole_export;
    };
}
```

## FRRouting Community Configuration

```text
# FRR vtysh configuration

# Ensure 2001:db8:dead:beef::1/128 already exists in the RIB
ipv6 prefix-list BLACKHOLE-V6 seq 10 permit 2001:db8:dead:beef::1/128

# Route map that tags the IPv6 host route with RFC 7999 BLACKHOLE
route-map BLACKHOLE-V6 permit 10
  match ipv6 address prefix-list BLACKHOLE-V6
  set community 65535:666 additive

router bgp 64496
  neighbor 2001:db8:100::1 remote-as 65001
  address-family ipv6 unicast
    neighbor 2001:db8:100::1 activate
    neighbor 2001:db8:100::1 route-map BLACKHOLE-V6 out
    network 2001:db8:dead:beef::1/128
```

## Cisco IOS Community Configuration

```text
! Configure community for IPv6 BGP
! Ensure 2001:db8:dead:beef::1/128 exists in the routing table
ipv6 prefix-list BLACKHOLE-V6 permit 2001:db8:dead:beef::1/128

router bgp 64496
  neighbor 2001:db8:100::1 remote-as 65001
  address-family ipv6 unicast
    neighbor 2001:db8:100::1 activate
    neighbor 2001:db8:100::1 send-community
    neighbor 2001:db8:100::1 route-map BLACKHOLE-OUT out
    network 2001:db8:dead:beef::1/128

! Route map
route-map BLACKHOLE-OUT permit 10
  match ipv6 address prefix-list BLACKHOLE-V6
  set community 65535:666 additive
```

## Testing Community Propagation

```bash
# Check if communities are present on IPv6 routes in BIRD
birdc "show route 2001:db8:dead:beef::1/128 all"

# In FRR
vtysh -c "show bgp ipv6 community 65535:666"

# Look for community attribute in output
# Example: Community: 65535:666

# Replace the example prefix with a live announced /128 before querying RIPEstat
curl "https://stat.ripe.net/data/bgp-state/data.json?resource=2001:db8:dead:beef::1/128" | jq '.data.bgp_state[].community'
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor BGP session health for your IPv6 peers and track route counts. Unexpected drops in prefix counts may indicate community-based filtering is rejecting your routes.

## Conclusion

The BLACKHOLE community is carried on IPv6 routes the same way it is on IPv4 routes, but the receiving network must explicitly choose to honor it. Always verify community propagation with your router CLI and external route visibility tools, and test policy changes in a lab environment before applying them to production IPv6 BGP sessions.
