# Validation Summary: How to Understand IPv6 Multicast Scope Levels

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 multicast addressing
- IPv6 multicast scope levels
- Multicast routing boundaries
- Cisco IOS IPv6 multicast configuration
- Linux `iproute2`
- Linux `ip6tables`

## Sources Consulted
- RFC 4291, "IP Version 6 Addressing Architecture": https://www.rfc-editor.org/rfc/rfc4291
- RFC 7346, "IPv6 Multicast Address Scopes": https://datatracker.ietf.org/doc/html/rfc7346
- IANA IPv6 Multicast Address Space registry: https://www.iana.org/assignments/ipv6-multicast-addresses/ipv6-multicast-addresses.xhtml
- Cisco IOS IP Multicast Command Reference, `ipv6 multicast boundary`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipmulti/command/imc-cr-book/imc_i4.html
- Debian `ping(8)` man page for current `iputils`: https://manpages.debian.org/trixie/iputils-ping/ping.8.en.html
- Debian `ip-mroute(8)` man page for `iproute2`: https://manpages.debian.org/trixie/iproute2/ip-mroute.8.en.html
- Debian `ip-maddress(8)` man page for `iproute2`: https://manpages.debian.org/testing/iproute2/ip-maddress.8.en.html
- Local CLI help from the installed tools: `ping -6 -h`, `ip6tables -h`, `ip route help`

## Issues Found
- The post said the scope value is encoded in the "third nibble" of the multicast address. RFC 4291 defines multicast as `11111111 | flgs | scop | group ID`, so I corrected this to the fourth nibble, or the low 4 bits of the second octet.
- The router-boundary summary implied that routers block multicast for scopes larger than the configured boundary. I corrected the wording to reflect RFC 4291 and Cisco's command reference: packets are not forwarded past the boundary implied by their own destination scope.
- The test command used `ff05::1` as a site-local target. RFC 4291 only defines all-nodes for scopes 1 and 2, while `ff05::2` is the defined site-local all-routers address, so I changed the example and clarified the condition that site-local multicast routing must exist.
- The Linux `ip6tables` examples implied that `ff05::/16` and `ff0e::/16` generically represent all traffic at those scopes. Because the scope is only one nibble and the flags nibble can vary, those prefixes cover the common permanently assigned form, not every possible scope-5 or scope-e multicast address. I narrowed the wording accordingly.
- The mDNS example implied that crossing subnets can be fixed by switching mDNS itself to site-local scope. I corrected the guidance so it applies to protocols designed for broader scopes, while keeping mDNS behind a proxy example such as Avahi.

## Review Notes
- Realm-local scope value `3` is defined by RFC 7346, which updates RFC 4291.
- The post's Cisco IOS command is valid as written; only the explanatory comment needed correction.
- Current `iputils` documentation uses `ping` with `-6`, although `ping6` remains commonly available as an alias on Linux systems.
- `ip6tables` syntax is still valid on current Linux systems, but many distributions now implement it through the nftables compatibility layer.
