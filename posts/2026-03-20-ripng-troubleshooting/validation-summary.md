# Validation Summary: How to Troubleshoot RIPng Routing Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- RIPng
- IPv6 routing
- FRRouting ripngd, vtysh, and zebra
- Linux iproute2, ip6tables, tcpdump, and systemd/journalctl
- Cisco IOS/XE RIPng verification commands

## Sources Consulted
- FRRouting RIPng documentation: https://docs.frrouting.org/en/latest/ripngd.html
- FRRouting basic setup and daemon configuration: https://docs.frrouting.org/en/latest/setup.html
- FRRouting zebra documentation: https://docs.frrouting.org/en/latest/zebra.html
- FRRouting ripng debug command source: https://github.com/FRRouting/frr/blob/master/ripngd/ripng_debug.c
- FRRouting Linux route protocol definitions: https://github.com/FRRouting/frr/blob/master/zebra/rt_netlink.h
- FRRouting iproute2 protocol aliases: https://github.com/FRRouting/frr/blob/master/tools/etc/iproute2/rt_protos.d/frr.conf
- RFC 2080, RIPng for IPv6: https://datatracker.ietf.org/doc/html/rfc2080
- Cisco IOS XE RIPng verification documentation: https://www.cisco.com/c/en/us/td/docs/routers/sdwan/configuration/routing/ios-xe-17/routing-configuration-guide-17-x/routing-information-protocol-ref/verification-commands-for-ripng-configuration.html
- Cisco IOS RIPng VRF-aware support documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_rip/configuration/15-s/irr-15-s-book/irr-ipv6-ripng.html
- Local iproute2 6.1.0 command output: `ip -6 route help` and `/etc/iproute2/rt_protos`

## Issues Found
- `show ipv6 ripng interface` is not a current FRRouting RIPng command. Changed it to `show ipv6 ripng status`, which FRR documents as showing RIPng status and configuration.
- The FRR config example used an inline `!` comment after `network eth0`. Removed the inline comment so the command can be entered literally in vtysh.
- The ip6tables examples required both source and destination UDP port 521 for generic rules. Relaxed them to allow inbound traffic to UDP 521 and outbound traffic from UDP 521, which better matches normal RIPng traffic and diagnostic requests described by RFC 2080.
- The metric-checking AWK command inspected field `$3`, which is the next-hop field in typical `show ipv6 ripng` output. Changed the metric checks to field `$5` and replaced the broad `grep " 16 "` with an AWK metric check.
- `no debug ripng all` is not one of the FRRouting RIPng debug disable commands in current source. Changed it to `no debug ripng events` and `no debug ripng packet`.
- The slow convergence row described routes taking 3-5 minutes to propagate. Updated it to describe failed routes aging out, matching RFC 2080's 180-second timeout and 120-second garbage-collection behavior.
- The missing link-local row used "No adjacency" even though RIPng is not an adjacency-forming protocol. Changed the symptom to "Routes not learned."
- `ip -6 route show proto ripng` depends on FRR's iproute2 protocol alias being installed. Added `ip -6 route show proto 190` as the numeric fallback for FRR's RIPng kernel protocol value.

## Review Notes
The post is technically relevant and generally accurate after the corrections. Future improvements could include nftables equivalents for systems that no longer manage firewall policy with ip6tables.
