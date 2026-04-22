# Validation Summary: How to Configure SLAAC on macOS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- macOS IPv6 networking
- SLAAC and Router Advertisements
- `networksetup`
- `ifconfig`
- `ipconfig`
- `sysctl`
- DHCPv6 and IPv6 privacy extensions

## Sources Consulted
- Apple Platform Security: IPv6 security - https://support.apple.com/guide/security/ipv6-security-seccb625dcd9/web
- Apple Support: Use IPv6 on Mac - https://support.apple.com/guide/mac-help/mchlp2499/mac
- Apple Support: Change TCP/IP settings on Mac - https://support.apple.com/guide/mac-help/change-tcpip-settings-on-mac-mh14129/mac
- Apple Remote Desktop: About networksetup - https://support.apple.com/guide/remote-desktop/about-networksetup-apdd0c5a2d5/mac
- macOS `networksetup(8)` man page mirror - https://www.manpagez.com/man/8/networksetup/osx-10.11.6.php
- Apple Open Source `ipconfig(8)` man page - https://github.com/apple-oss-distributions/bootp/blob/main/ipconfig.tproj/ipconfig.8
- Apple Open Source `ifconfig(8)` and IPv6 flag output - https://github.com/apple-oss-distributions/network_cmds/blob/main/ifconfig.tproj/ifconfig.8 and https://github.com/apple-oss-distributions/network_cmds/blob/main/ifconfig.tproj/af_inet6.c
- Apple Open Source XNU IPv6 sysctls and defaults - https://github.com/apple-oss-distributions/xnu/blob/main/bsd/netinet6/nd6.h, https://github.com/apple-oss-distributions/xnu/blob/main/bsd/netinet6/in6_proto.c, and https://github.com/apple-oss-distributions/xnu/blob/main/bsd/netinet6/in6_src.c
- RFC 4861: Neighbor Discovery for IPv6 - https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration - https://datatracker.ietf.org/doc/html/rfc4862
- RFC 8981: Temporary Address Extensions for SLAAC - https://datatracker.ietf.org/doc/html/rfc8981
- RFC 3972: Cryptographically Generated Addresses - https://datatracker.ietf.org/doc/html/rfc3972
- `rdisc6(8)` man page for the ndisc6 package - https://www.mankier.com/8/rdisc6

## Issues Found
- The post described macOS `secured` IPv6 addresses as RFC 7217 stable privacy addresses. Apple documents macOS SLAAC address generation as CGA-based per RFC 3972, with temporary privacy addresses used for new connections. Updated the introduction, address label explanations, and conclusion.
- The privacy sysctl section used Linux-style `use_tempaddr=2` semantics. On macOS/XNU, `net.inet6.ip6.use_tempaddr` enables temporary addresses and `net.inet6.ip6.prefer_tempaddr` controls source-address preference. Updated examples and defaults to `use_tempaddr=1` and `prefer_tempaddr=1`.
- `networksetup` set commands require elevated privileges. Added `sudo` to the IPv6 configuration and toggle examples.
- The Router Advertisement explanation incorrectly said the M flag makes macOS use DHCPv6 instead of SLAAC. Updated it to distinguish the Prefix Information Autonomous (A) flag from the RA M/O flags.
- `ipconfig set en0 AUTOMATIC-V6` was described as a persistent renew operation via `networksetup`. Updated it to state that it creates a temporary automatic IPv6 service for debugging/refresh purposes.
- Replaced invalid or incorrect detail commands: `networksetup -getv6settings en0`, `ipconfig getifaddr en0` as a primary IPv6 query, and `ipconfig getoption en0 IPv6Address`. Used `networksetup -getnetworkserviceenabled`, `ifconfig -L en0 inet6`, `ipconfig getsummary`, `ipconfig getra`, and `ipconfig getv6packet` where appropriate.
- Changed the System Settings snippet fence from `sql` to `text` and clarified that the GUI "Off" option may only appear for some network services.

## Review Notes
The post is technically valid after edits. Some macOS command behavior is version- and service-dependent, especially GUI availability of "Off" and third-party `rdisc6`; the post now includes caveats where that matters.
