# Validation Summary: How IPv6 Source Address Selection Works

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- RFC 6724 source address selection
- Linux `iproute2`
- glibc `getaddrinfo()` / `/etc/gai.conf`
- Linux IPv6 sysctls
- Python 3

## Sources Consulted
- RFC 6724, Default Address Selection for Internet Protocol Version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc6724
- RFC 4941, Privacy Extensions for Stateless Address Autoconfiguration in IPv6: https://datatracker.ietf.org/doc/html/rfc4941
- RFC 7217, A Method for Generating Semantically Opaque Interface Identifiers with IPv6 SLAAC: https://datatracker.ietf.org/doc/html/rfc7217
- Linux `gai.conf(5)` manual: https://man7.org/linux/man-pages/man5/gai.conf.5.html
- Linux `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux `ip-rule(8)` manual: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- Linux `ip-address(8)` manual: https://man7.org/linux/man-pages/man8/ip-address.8.html
- Linux `ip-addrlabel(8)` manual: https://man7.org/linux/man-pages/man8/ip-addrlabel.8.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html

## Issues Found
- The RFC 6724 rule list was incomplete and slightly inaccurate. I corrected Rule 5 wording, added Rule 5.5, removed the incorrect implication that matching labels come from `gai.conf`, and aligned Rule 7 wording with RFC 6724.
- The route examples used invalid placeholder literals such as `2001:db8::destination` and `fe80::gw`. I replaced them with syntactically valid documentation addresses.
- The policy-routing example incorrectly implied that `ip -6 rule add from ... table ...` chooses the source address. I changed it to a correct example where the selected table contains a route with `src`, and clarified that the route's `src` attribute provides the preferred source.
- The `/etc/gai.conf` section incorrectly stated that `gai.conf` directly affects kernel source-address selection and included an invalid `temporaryaddress yes` line. I corrected the section to describe `getaddrinfo()` destination sorting, noted that adding `label` or `precedence` entries replaces the default table, and pointed to `ip addrlabel` for Linux kernel label policy.
- The privacy section overstated what `use_tempaddr=0` and `addr_gen_mode=3` mean. I clarified that `use_tempaddr=0` disables temporary addresses, while `addr_gen_mode=3` affects link-local and SLAAC/autoconf address generation.
- The Python example had unnecessary imports and indirect parsing logic. I simplified it without changing the intended behavior.

## Review Notes
- The operational commands in this post are Linux-specific even though RFC 6724 itself is platform-independent.
- RFC 6724 Rule 5.5 exists, but the RFC notes that it only applies on implementations that track which next-hop advertised which prefixes.
- On Linux, `/etc/gai.conf` and kernel source-address selection are related but separate layers: `gai.conf` affects destination ordering returned by `getaddrinfo()`, while route `src`, address properties, and kernel addrlabels influence source selection.
