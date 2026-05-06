# How to Configure BGP IPv6 AS-Path Prepending

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, AS-Path Prepending, Traffic Engineering, Routing

Description: Configure AS-path prepending for IPv6 prefixes to influence inbound traffic distribution from multiple upstream providers.

## Overview

Configure AS-path prepending for IPv6 prefixes to influence inbound traffic distribution from multiple upstream providers.

## AS-Path Prepending and IPv6

AS-path prepending artificially lengthens the AS_PATH attribute by adding extra copies of your own ASN to outbound route announcements. It works the same way for IPv6 prefixes as it does for IPv4 because IPv6 BGP uses multiprotocol extensions while keeping the same path attributes.

## AS_PATH Behavior

BGP adds the local AS once when advertising a route to an eBGP peer. RFC 4271 also allows local policy to prepend additional copies of the local AS to make a path less attractive:
```text
Normal eBGP advertisement:     64496
Prepended twice in policy:     64496 64496 64496
```

## BIRD2 Configuration Example

```bird
# /etc/bird/bird.conf

router id 192.0.2.1;

protocol static static_v6 {
    ipv6;
    route 2001:db8:100::/48 blackhole;
}

filter prepend_v6 {
    if net = 2001:db8:100::/48 then {
        bgp_path.prepend(64496);
        bgp_path.prepend(64496);
    }
    accept;
}

protocol bgp upstream {
    local as 64496;
    neighbor 2001:db8:0:1::1 as 65001;
    ipv6 {
        import none;
        export filter prepend_v6;
    };
}
```

## FRRouting AS-Path Prepending Configuration

```bash
# FRR vtysh configuration
router bgp 64496
  neighbor 2001:db8:0:1::1 remote-as 65001
  address-family ipv6 unicast
    neighbor 2001:db8:0:1::1 activate
    neighbor 2001:db8:0:1::1 route-map PREPEND-V6 out
  exit-address-family

ipv6 prefix-list PREPEND-V6 seq 10 permit 2001:db8:100::/48

route-map PREPEND-V6 permit 10
  match ipv6 address prefix-list PREPEND-V6
  set as-path prepend 64496 64496

route-map PREPEND-V6 permit 20
```

## Cisco IOS AS-Path Prepending Configuration

```text
! Configure AS-path prepending for IPv6 BGP
router bgp 64496
  neighbor 2001:DB8:0:1::1 remote-as 65001
  address-family ipv6 unicast
    neighbor 2001:DB8:0:1::1 activate
    neighbor 2001:DB8:0:1::1 route-map PREPEND-V6 out
  exit-address-family

ipv6 prefix-list PREPEND-V6 seq 10 permit 2001:DB8:100::/48

route-map PREPEND-V6 permit 10
  match ipv6 address prefix-list PREPEND-V6
  set as-path prepend 64496 64496

route-map PREPEND-V6 permit 20
```

## Testing AS-Path Prepending

```bash
# Inspect the route selected for export in BIRD
birdc "show route 2001:db8:100::/48 export upstream all"
# Confirm the final on-wire AS_PATH from the peer side or an external source

# In FRR
vtysh -c "show bgp ipv6 unicast neighbors 2001:db8:0:1::1 advertised-routes"

# In Cisco IOS
show bgp ipv6 unicast neighbors 2001:DB8:0:1::1 advertised-routes

# Look for repeated copies of your ASN in the AS path

# Use RIPEstat for external verification
PREFIX="2001:db8:100::/48"  # replace with your announced public prefix
curl "https://stat.ripe.net/data/bgp-state/data.json?resource=${PREFIX}" | jq '.data.bgp_state[].path'
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor BGP session health for your IPv6 peers and track route counts. Unexpected path changes or prefix loss may indicate that your prepending policy is being applied incorrectly or that an upstream stopped accepting the route.

## Conclusion

AS-path prepending works the same for IPv6 prefixes as it does for IPv4: apply the policy on outbound announcements in the IPv6 unicast address family and prepend only your own ASN. Always verify the advertised AS_PATH from the peer side or an external looking glass before applying changes to production IPv6 BGP sessions.
