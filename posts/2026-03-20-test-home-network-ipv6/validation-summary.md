# Validation Summary: How to Test IPv6 Connectivity on Your Home Network

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6
- DHCPv6 Prefix Delegation
- Router Advertisements and SLAAC
- OpenWrt IPv6 configuration
- Linux, macOS, and Windows IPv6 diagnostic commands
- tcpdump, rdisc6, iputils ping, dig, curl, and traceroute
- IPv6 Path MTU Discovery

## Sources Consulted
- RFC 7084, Basic Requirements for IPv6 Customer Edge Routers: https://datatracker.ietf.org/doc/rfc7084/
- RFC 8415, Dynamic Host Configuration Protocol for IPv6: https://www.rfc-editor.org/rfc/rfc8415.html
- RFC 4861, Neighbor Discovery for IPv6: https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 8200, IPv6 Specification: https://datatracker.ietf.org/doc/rfc8200/
- RFC 8201, Path MTU Discovery for IPv6: https://datatracker.ietf.org/doc/html/rfc8201
- IANA IPv6 Address Space registry: https://www.iana.org/assignments/ipv6-address-space
- OpenWrt IPv6 configuration and odhcpd documentation: https://openwrt.org/docs/guide-user/network/ipv6/configuration and https://openwrt.org/docs/techref/odhcpd
- Microsoft Learn, Get-NetIPAddress and ipconfig: https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress and https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/dd197434%28v%3Dws.11%29
- Google Public DNS documentation: https://developers.google.com/speed/public-dns/docs/using
- Cloudflare 1.1.1.1 resolver documentation: https://blog.cloudflare.com/dns-resolver-1-1-1-1/
- iputils ping local man page and help output, verified against iputils 20240117
- tcpdump/libpcap filter syntax, verified with local tcpdump filter compilation and pcap-filter documentation: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- curl local manual for `--ipv6` / `-6`
- BIND `dig -h` output for `-6` and AAAA query syntax

## Issues Found
- The example IPv6 prefix `2001:db8:home:1::/64` was not syntactically valid because `home` is not hexadecimal. Replaced it with `2001:db8:1234:1::/64`.
- The OpenWrt delegated-prefix check only searched routes for `/56` or `/48`, missing other common delegations such as `/60` and not using OpenWrt's interface status data. Replaced it with `ifstatus "$WAN6_IF"` filtered for `ipv6-prefix`.
- The ISP gateway ping assumed the link-local gateway was always `fe80::1`. Added a default-route check and made the gateway address an example to replace with the route output.
- The OpenWrt RA configuration check only inspected `network.lan.ip6assign`, which does not show odhcpd RA settings. Added `uci show dhcp.lan` filtering for RA/DHCPv6 options.
- The device address checks used broad `scope global` / `ipconfig` output that can include non-public ULA addresses. Updated Linux, macOS, Windows PowerShell, and the automated script to look for current IANA global unicast space (`2000::/3`, displayed as addresses beginning with `2` or `3`).
- The DNS transport test used an IPv6 resolver literal but did not explicitly force IPv6 transport in `dig`. Added `dig -6`.
- The MTU test treated `ping -s` as total packet size. Corrected it to subtract 48 bytes for IPv6 plus ICMPv6 headers and use `-M do` for path MTU probing on iputils ping.
- The MTU explanation implied generic silent failures and described `net.ipv6.conf.all.disable_ipv6=0` as enabling PMTUD. Reworded this to describe ICMPv6 Packet Too Big handling and correct RA MTU advertisement.
- The automated script passed pipelines to the `check` helper incorrectly, so the checks would test the helper's output rather than the intended commands. Wrapped pipeline checks in `bash -c`.
- Replaced a basic `grep` alternation in the OpenWrt log command with `grep -E` for clearer portable alternation.

## Review Notes
The guide is technically relevant and validated after the corrections. Some commands remain environment-dependent, especially interface names (`eth0.2`, `wan6`, `br-lan`) and tool availability (`rdisc6`, `traceroute6`, `dig`), but the post now calls out the main interface-name assumptions where they affect correctness.
