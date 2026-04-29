# Validation Summary: How to View the IPv6 Routing Table on macOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- macOS
- `netstat`
- `route`
- `ifconfig`
- `networksetup`
- `system_profiler`

## Sources Consulted
- Apple OSS `netstat` man page: https://raw.githubusercontent.com/apple-oss-distributions/network_cmds/main/netstat.tproj/netstat.1
- Apple OSS `route` man page: https://raw.githubusercontent.com/apple-oss-distributions/network_cmds/main/route.tproj/route.8
- Apple OSS `ifconfig` man page: https://raw.githubusercontent.com/apple-oss-distributions/network_cmds/main/ifconfig.tproj/ifconfig.8
- Apple OSS `netstat` route flag mappings: https://raw.githubusercontent.com/apple-oss-distributions/network_cmds/main/netstat.tproj/route.c
- Apple Support, About `networksetup` in Remote Desktop: https://support.apple.com/en-mn/guide/remote-desktop/apdd0c5a2d5/mac
- Apple Support, System Information User Guide for macOS: https://support.apple.com/en-us/HT203001
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861

## Issues Found
- The `netstat -rn -f inet6` comment incorrectly described the command as using "verbose flags". I changed it to say the command shows the IPv6 routing table in numeric form, which matches Apple’s `netstat` documentation for `-r`, `-n`, and `-f`.
- The route flag table had incorrect meanings for `C`, `c`, and `I`, and it omitted `g` even though `g` appears in the sample output. I corrected the flag descriptions to match Apple’s route flag definitions.
- The `route -n get -inet6` sample output included overly specific values and flags that are not reliable as a generic example. I replaced that block with the key fields the command returns so the example stays accurate across systems.
- The `networksetup` section described `Wi-Fi` and `Ethernet` as interfaces. I changed that wording to `network service`, which is the terminology Apple uses for `networksetup`.
- The `ifconfig en0 inet6 | grep "scopeid 0x0"` example was not a reliable way to isolate non-link-local IPv6 addresses. I replaced it with a filter that excludes `fe80:` addresses directly.
- The `system_profiler` section incorrectly implied that `SPNetworkDataType` shows IPv6 routing information. I corrected it to describe IPv6 address details and related network information instead.
- The live monitoring section used `watch`, which is not a standard stock macOS utility. I replaced it with a shell loop built from standard macOS command-line tools and kept `route -n monitor` as the built-in event monitor.
- The summary referred to `networksetup -getinfo <interface>`. I corrected that to `networksetup -getinfo <network service>` and clarified that it reports IPv6 settings and router information rather than the routing table itself.

## Review Notes
- The default IPv6 route on a typical local network uses the router’s link-local address as the next hop, which is consistent with IPv6 Neighbor Discovery behavior described in RFC 4861.
