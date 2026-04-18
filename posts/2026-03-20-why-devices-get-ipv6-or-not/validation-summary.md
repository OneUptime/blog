# Validation Summary: How to Understand Why Some Devices Get IPv6 and Others Don't

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- IPv6 / SLAAC
- Router Advertisements (ICMPv6 type 134)
- Linux sysctl (`net.ipv6.conf.*.disable_ipv6`, `accept_ra`, `autoconf`)
- Windows `netsh interface ipv6`
- Windows `pktmon` packet capture tool
- `tcpdump` for ICMPv6
- `ip -6 neigh` (NDP cache) and `ping6` multicast
- IPv6 Privacy Extensions (RFC 4941 / RFC 8981)
- Android / iOS MAC address randomization

## Sources Consulted
- RFC 4862 (IPv6 Stateless Address Autoconfiguration)
- RFC 4941 (Privacy Extensions for SLAAC) and its successor RFC 8981
- RFC 4443 (ICMPv6), specifically Type 134 = Router Advertisement
- Microsoft Learn — `pktmon filter add`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/pktmon-filter-add
- Microsoft Learn — `pktmon start`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/pktmon-start
- Microsoft Learn — Pktmon command formatting: https://learn.microsoft.com/en-us/windows-server/networking/technologies/pktmon/pktmon-syntax
- Linux kernel Documentation/networking/ip-sysctl.txt (accept_ra, autoconf, disable_ipv6 semantics)
- tcpdump pcap-filter man page (IPv6 byte-offset filters)
- Apple Platform Deployment documentation (iOS 14+ Private Wi-Fi Address)

## Issues Found

1. **Invalid hexadecimal in sample IPv6 addresses.** The examples used `2001:db8:home:1::1` and `2001:db8:home:1:a1b2:c3d4:e5f6:7890`. The string `home` contains the letters `h`, `o`, `m`, which are not valid hexadecimal digits, so these are not syntactically valid IPv6 addresses. Replaced with `2001:db8:1:1::1` and `2001:db8:1:1:a1b2:c3d4:e5f6:7890` (still within the RFC 3849 `2001:db8::/32` documentation prefix).

2. **Incorrect `pktmon` syntax.** The original command `pktmon filter add -t IPv6 -p ICMPv6` is invalid:
   - `-t` takes a transport protocol value (`TCP`, `UDP`, `ICMP`, `ICMPv6`), not an IP version like `IPv6`.
   - `-p` takes a port number, not a protocol name. `ICMPv6` is not a port.
   - A filter name is a positional argument, not optional flag.
   
   Corrected to: `pktmon filter add RAFilter -t ICMPv6`.

3. **Incorrect `pktmon start` flag.** The original used `--file c:\temp\capture.etl`. The documented flag is `--file-name`. Corrected to `pktmon start --capture --file-name c:\temp\capture.etl`.

## Review Notes

- RFC 4941 (referenced in Reason 2) was obsoleted by RFC 8981 (February 2021). The post still refers to RFC 4941, which remains widely recognizable and is not technically wrong — RFC 4941 introduced the mechanism — but future revisions could cite RFC 8981 for the current specification.
- `ping6` is deprecated on modern Linux distributions (iputils merged into `ping`), but it is still present on OpenWrt / BusyBox-based routers where `br-lan` exists, so the example remains valid in context.
- The `tcpdump` filter `'icmp6 and ip6[40] == 134'` is correct: the IPv6 fixed header is 40 bytes, so `ip6[40]` is the first byte after it (the ICMPv6 Type field), and 134 is the Router Advertisement type. This only matches when no IPv6 extension headers are present — acceptable caveat for a home-network diagnostic.
- iOS 14+ MAC randomization is per-SSID (stable for each known network), not per-connection. The post's wording "Rotates MAC address per network" captures this correctly.
- `accept_ra=2` is required when IPv6 forwarding is also enabled on the interface; value `1` suffices for typical end-host configurations. The post's guidance to set it to `1` is appropriate for the target audience (client devices).
