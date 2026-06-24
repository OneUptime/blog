# How to Configure BGP IPv6 Route Dampening

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Route Dampening, Stability, FRRouting

Description: Configure BGP route dampening for IPv6 prefixes to suppress flapping routes and improve routing stability.

## Overview

Configure BGP route dampening for IPv6 prefixes to suppress flapping routes and improve routing stability. Route dampening is defined in RFC 2439, and RFC 7196 recommends less aggressive thresholds than older vendor defaults.

## BGP Route Dampening and IPv6

BGP route dampening is separate from BGP communities. The dampening algorithm can be applied to IPv6 prefixes only on platforms that implement it for the IPv6 address family, so support is implementation-specific rather than universal.

## Dampening Parameters

The common route dampening parameters are:
```text
half-life          # Penalty decay interval in minutes
reuse              # Threshold below which a suppressed route is reused
suppress           # Threshold above which a route is suppressed
max-suppress-time  # Maximum suppression time in minutes

RFC 7196 recommends a suppress threshold of at least 6000,
with 12000 as a more conservative value.
```

## BIRD2 Support Status

BIRD2 does not currently provide a documented BGP route-flap dampening configuration, so there is no BIRD2 IPv6 dampening stanza to enable.

## FRRouting Support Status

```bash
router bgp 64496
  bgp dampening 15 750 6000 60
```

In current FRRouting releases, route-flap dampening is configured at the BGP instance or neighbor level, but the implementation currently works only for IPv4 unicast and multicast routes. There is no working FRRouting configuration that applies route-flap dampening to IPv6 unicast routes.

## Cisco IOS Configuration

On Cisco IOS platforms that support `bgp dampening` under `address-family ipv6 unicast`, a basic configuration looks like this:

```text
router bgp 64496
  neighbor 2001:db8:0:1::1 remote-as 65001
  address-family ipv6 unicast
    neighbor 2001:db8:0:1::1 activate
    bgp dampening 15 750 6000 60
```

## Testing Route Dampening

```text
# On Cisco IOS, show dampened IPv6 routes
show bgp ipv6 unicast dampening dampened-paths

# Show flap statistics and current penalties
show bgp ipv6 unicast dampening flap-statistics

# Clear dampening state for a test prefix after lab validation
clear bgp ipv6 unicast dampening 2001:db8::/64
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor BGP session health for your IPv6 peers and track route counts. Repeated session resets or rapid oscillation in accepted IPv6 prefixes may indicate route flapping and justify dampening on platforms that support it.

## Conclusion

IPv6 route dampening is platform-specific. Cisco IOS provides IPv6 dampening commands, current FRRouting documentation limits route-flap dampening to IPv4 unicast and multicast, and BIRD2 does not currently document a BGP route-flap dampening feature. If you enable dampening, prefer conservative thresholds consistent with RFC 7196 and test in a lab before applying changes to production IPv6 BGP sessions.
