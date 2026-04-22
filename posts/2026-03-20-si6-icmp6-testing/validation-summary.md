# Validation Summary: How to Use the SI6 Networks icmp6 Tool for ICMPv6 Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SI6 Networks IPv6 Toolkit
- `icmp6` command-line tool
- ICMPv6 error messages and Type:Code values
- IPv6 Path MTU Discovery
- IPv6 Neighbor Discovery Protocol
- Linux `ip route` / `ip -6 route get`
- IPv6 firewall filtering guidance

## Sources Consulted
- SI6 Networks IPv6 Toolkit official page: https://www.si6networks.com/research/tools/ipv6toolkit/
- SI6 Networks IPv6 Toolkit GitHub repository: https://github.com/fgont/ipv6toolkit
- SI6 Networks `icmp6` manual source: https://raw.githubusercontent.com/fgont/ipv6toolkit/master/manuals/icmp6.1
- SI6 Networks `icmp6` source code: https://raw.githubusercontent.com/fgont/ipv6toolkit/master/tools/icmp6.c
- Debian `icmp6(1)` man page for `ipv6toolkit`: https://manpages.debian.org/unstable/ipv6toolkit/icmp6.1.en.html
- Ubuntu package details for `ipv6toolkit`: https://packages.ubuntu.com/noble/ipv6toolkit
- Arch Linux official package search API: https://archlinux.org/packages/search/json/?name=ipv6toolkit
- Arch User Repository RPC metadata for `ipv6toolkit`: https://aur.archlinux.org/rpc/?v=5&type=info&arg[]=ipv6toolkit
- IANA ICMPv6 Parameters registry: https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- RFC 4443, ICMPv6 specification: https://datatracker.ietf.org/doc/rfc4443/
- RFC 4861, IPv6 Neighbor Discovery: https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4890, ICMPv6 filtering recommendations: https://datatracker.ietf.org/doc/rfc4890/
- `ip-route(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html

## Issues Found
1. **Incorrect `icmp6` Type/Code syntax**: The post used `-t TYPE -c CODE`, but the official `icmp6` help and man page define `-t TYPE:CODE`; `-c` is the IPv6 hop-limit option. Changed all examples to `-t 1:0`, `-t 2:0`, `-t 3:0`, `-t 128:0`, etc.
2. **Invalid placeholder IPv6 addresses**: Examples such as `2001:db8::target` and `2001:db8::router` are not syntactically valid IPv6 addresses. Replaced them with valid RFC 3849 documentation-prefix addresses such as `2001:db8::10`, `2001:db8::1`, and `2001:db8::60`.
3. **Unsupported flood options**: `--loop-count` and `--src-addr-shuffle` are not supported by `icmp6`, and `--sleep 0` is rejected by the tool. Reworked the section as looping/repeated probes using supported `--loop --sleep 1` syntax and a shell loop for separate source-address probes.
4. **Arch install command was not accurate**: `ipv6toolkit` is not present in the official Arch package search, while AUR metadata exists for an `ipv6toolkit` package. Replaced `sudo pacman -S ipv6toolkit` with guidance to use the AUR package or build from SI6 Networks source.
5. **PMTUD verification command was weak on modern Linux**: Replaced `ip route show cache | grep mtu` with `ip -6 route get 2001:db8::40`, which is the more direct IPv6 route lookup command for checking route attributes.
6. **RFC 4890 table was incomplete and overbroad**: Added Parameter Problem Type 4 codes 1/2, narrowed Time Exceeded to Type 3 code 0 for "must not be dropped", changed Echo 128/129 to "Yes" for local firewall connectivity checking, and qualified NDP 133-136 as required on local links.
7. **Overbroad description of `icmp6`**: The post described `icmp6` as a general tool for crafting any ICMPv6 message. The official documentation focuses on ICMPv6 error-message testing, with dedicated SI6 tools for full NDP messages. Updated the description and closing note accordingly.

## Review Notes
- Representative `icmp6` examples were parsed against the Ubuntu `ipv6toolkit` binary extracted from the package; they reached the expected root-privilege check, which confirms option parsing without sending packets.
- The Echo Request example uses `-n` to avoid adding the default embedded error payload. For normal echo diagnostics, `ping -6` remains the more appropriate tool.
- The SI6 source tree currently identifies the toolkit as v2.2, while Ubuntu Noble packages v2.0. The corrected options are supported by both the packaged binary and the upstream source.
