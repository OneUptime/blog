# Validation Summary: How to Use THC-IPv6 Toolkit for Security Testing

## Status
validated

## Post Type
Tutorial / Security testing guide

## Technologies Covered
- THC-IPv6 toolkit
- IPv6 Neighbor Discovery Protocol (NDP)
- Router Advertisements (RA)
- Neighbor Advertisements (NA)
- IPv6 implementation checks
- Linux command-line networking tools

## Sources Consulted
- THC-IPv6 upstream repository and README: https://github.com/vanhauser-thc/thc-ipv6
- THC-IPv6 upstream Makefile: https://github.com/vanhauser-thc/thc-ipv6/blob/master/Makefile
- Kali Linux THC-IPv6 tool documentation: https://www.kali.org/tools/thc-ipv6/
- Debian THC-IPv6 manual page, including the `atk6-` command prefix note: https://manpages.debian.org/bullseye/thc-ipv6/atk6-randicmp6.8.en.html
- Debian THC-IPv6 package Makefile showing `atk6` prefixed binaries: https://sources.debian.org/src/thc-ipv6/3.8-1/Makefile
- Ubuntu `thc-ipv6` package 3.8-1build3 help output for `atk6-alive6`, `atk6-fake_router6`, `atk6-fake_router26`, `atk6-parasite6`, `atk6-ndpexhaust26`, `atk6-flood_router6`, `atk6-implementation6`, and `atk6-detect-new-ip6`
- RFC 4861, Neighbor Discovery for IP version 6: https://datatracker.ietf.org/doc/html/rfc4861
- RFC 6105, IPv6 Router Advertisement Guard: https://datatracker.ietf.org/doc/html/rfc6105
- RFC 6583, Operational Neighbor Discovery Problems: https://datatracker.ietf.org/doc/html/rfc6583
- RFC 3971, SEcure Neighbor Discovery (SEND): https://www.rfc-editor.org/rfc/rfc3971.html

## Issues Found
- Debian/Ubuntu package command names were not explained. Added a note that packaged binaries use the `atk6-` prefix, while source builds use upstream command names.
- Source installation omitted documented build dependencies. Added `build-essential`, `libpcap-dev`, `libssl-dev`, and `libnetfilter-queue-dev`.
- `alive6 eth0 2001:db8::/64` was described as scanning a whole prefix, but current `alive6` treats a bare prefix as a single host unless enumeration options are used. Changed the example to `alive6 -C` for common addresses in a prefix.
- `alive6 -i eth0 ...` used `-i` incorrectly; current `-i` expects an input file. Replaced it with `alive6 -F eth0` for multiple probe types.
- `fake_router6` examples used invalid IPv6 placeholder text and treated the third argument as router lifetime. Replaced invalid addresses, used the third argument as DNS server, and used `fake_router26 -l` for router lifetime.
- `fake_router6 eth0 ::/0` was invalid for `fake_router6`, which requires a prefix length from 1 to 128. Removed that example and replaced it with a valid `fake_router26` lifetime example.
- `parasite6 eth0 2001:db8::target` was invalid because `parasite6` accepts an optional fake MAC address, not a target IPv6 address. Replaced it with a valid fake MAC example.
- `ndpexhaust6` is deprecated and the `-f` option was not present in current help output. Replaced the section with `ndpexhaust26`, corrected the target to a `/64`, and used the documented `-p` option.
- `flood_router6 -i eth0` was invalid because `flood_router6` supports `-H`, `-F`, and `-D`, not `-i`. Replaced it with `flood_router6 -H eth0`.
- `implementation6 -p HOP ...` and `implementation6 -a ...` were invalid. Replaced them with documented syntax for a specific test case and for skipping alive checks.
- Updated the defense table to reference `ndpexhaust26` and NDP queue/cache limits.

## Review Notes
The post is technically relevant and now matches the current THC-IPv6 3.8 command syntax. The examples still assume a lab interface named `eth0`; readers may need to substitute their actual interface name. The defenses table is directionally correct but intentionally brief and not a complete IPv6 hardening guide.
