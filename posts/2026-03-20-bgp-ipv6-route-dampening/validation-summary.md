# Validation Summary: How to Configure BGP IPv6 Route Dampening

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- Route flap dampening
- FRRouting
- BIRD2
- Cisco IOS

## Sources Consulted
- RFC 2439, BGP Route Flap Damping: https://www.rfc-editor.org/rfc/rfc2439
- RFC 7196, Making Route Flap Damping Usable: https://www.rfc-editor.org/rfc/rfc7196
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- BIRD 3.2.1 User's Guide: https://bird.nic.cz/doc/bird-3.2.1.html
- BIRD project mailing list discussion on route flap damping from BIRD maintainer: https://bird.network.cz/pipermail/bird-users/2022-February/015932.html
- Cisco IOS IP Routing: BGP Command Reference, `bgp dampening`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-a1.html
- Cisco IOS IPv6 Command Reference, `show bgp ipv6 ... dampening` and `clear bgp ipv6 ... dampening`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-r1.html and https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-a1.html
- RIPEstat BGP State API documentation: https://stat.ripe.net/docs/data-api/api-endpoints/bgp-state

## Issues Found
- The post title and description were about IPv6 route dampening, but the body was actually about BGP communities. I replaced the communities explanation and examples with route-dampening material so the article matches its stated topic.
- The BIRD2 example was not a route-dampening configuration at all. I replaced it with an accurate support-status note because current BIRD documentation does not provide a documented BGP route-flap dampening feature for IPv6.
- The FRRouting section incorrectly showed IPv6 community policy instead of dampening. I corrected it to reflect current FRR behavior: route-flap dampening exists, but the current documentation says it works only for IPv4 unicast and multicast, not IPv6 unicast.
- The Cisco IOS section incorrectly showed community matching instead of route dampening. I replaced it with an IPv6 BGP dampening configuration and used a suppress threshold of `6000`, which aligns with the minimum recommendation in RFC 7196 rather than the older default threshold of `2000`.
- The testing section was checking community propagation in BIRD, FRR, and RIPEstat, which does not validate route dampening. I replaced it with Cisco IOS commands that show dampened IPv6 paths, flap statistics, and clearing dampening state.
- The RIPEstat `jq` expression was wrong for the documented API schema and was also unrelated to dampening. I removed that command instead of preserving an invalid verification path.
- The monitoring and conclusion sections referred to community-based filtering rather than route flapping and dampening. I corrected both to reflect the actual topic and the current platform limitations.

## Review Notes
- FRRouting’s current BGP documentation says route-flap dampening is “not recommended nowadays” and currently works only for IPv4 unicast and multicast.
- In FRRouting, `bgp dampening` is configured at the BGP instance or neighbor level, not under `address-family ipv6 unicast`.
- Cisco IOS documentation confirms IPv6 dampening show and clear commands, but behavior can vary by train for where `bgp dampening` is entered; the post now keeps the example at the IPv6 address-family level and avoids train-specific discussion.
- BIRD support had to be validated from the project’s own documentation plus maintainer commentary because the user guide does not expose a route-dampening configuration section.
