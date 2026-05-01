# Validation Summary: How to Understand the Discard-Only Address Block (100::/64)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Remote Triggered Black Hole (RTBH) filtering
- BGP BLACKHOLE community
- Linux `iproute2`
- Linux `ip6tables`
- Python `ipaddress`
- Cisco IOS-XR
- Juniper Junos
- FRRouting (FRR)

## Sources Consulted
- RFC 6666, "A Discard Prefix for IPv6": https://www.rfc-editor.org/rfc/rfc6666
- IANA IPv6 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- RFC 7999, "BLACKHOLE Community": https://www.rfc-editor.org/rfc/rfc7999
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- FRRouting static route documentation: https://docs.frrouting.org/en/stable-10.0/static.html
- Junos `static (Routing Options)` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/static-edit-routing-options.html
- Cisco IOS XR static routes documentation: https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/routing/24xx/configuration/guide/b-routing-cg-cisco8000-24xx/implement-static-routes.html
- Local `ip -6 route help` output from `iproute2`
- Local `ip6tables -h` output

## Issues Found
- The introduction incorrectly described `192.0.2.0/24` as an IPv4 discard prefix. I changed this to reflect RFC 6666's actual background: operators have historically used private or documentation space for IPv4 RTBH, but IPv6 has a dedicated discard block.
- The Linux RTBH example used `ip -6 route add 100::/64 dev null`, which is not valid `iproute2` syntax. I corrected it to `ip -6 route add blackhole 100::/64`.
- The RTBH explanation said to advertise the attacked prefix "to `100::/64`" and used the invalid sample address `2001:db8::victim/128`. I corrected the wording to a next-hop inside `100::/64` and replaced the sample with the valid documentation address `2001:db8::100/128`.
- The Cisco IOS-XR example used IOS-style syntax (`ipv6 route ... Null0`) instead of IOS-XR static-route configuration syntax. I replaced it with the correct `router static` and `address-family ipv6 unicast` form using `null 0`.
- The BLACKHOLE community note overstated standardized behavior by implying `NO_EXPORT + 65535:666` universally causes routers to rewrite next hop to `100::1`. I corrected it to match RFC 7999: `65535:666` is the well-known BLACKHOLE community, and receiving routers apply local policy; `NO_EXPORT` or `NO_ADVERTISE` is commonly added to limit propagation.
- The conclusion said all routers should have a null route for the prefix. I narrowed this to routers participating in an RTBH design, which is what the RFC operational guidance supports.

## Review Notes
- The Python examples are syntactically correct and ran successfully with the standard-library `ipaddress` module.
- The `ip6tables` examples are syntactically valid. On many modern Linux distributions, they are implemented through the nftables backend (`ip6tables-nft`), but the commands shown remain valid compatibility syntax.
