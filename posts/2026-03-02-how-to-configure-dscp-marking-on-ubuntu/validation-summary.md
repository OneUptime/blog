# Validation Summary: How to Configure DSCP Marking on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux networking
- DSCP / DiffServ QoS
- iptables mangle table and DSCP target
- Linux tc, u32 filters, pedit, dsmark, HTB, fq_codel
- tcpdump, tshark, ping
- iptables-persistent / netfilter-persistent

## Sources Consulted
- RFC 2474: Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers: https://www.rfc-editor.org/rfc/rfc2474.html
- RFC 2597: Assured Forwarding PHB Group: https://www.rfc-editor.org/rfc/rfc2597
- RFC 3246: An Expedited Forwarding PHB: https://www.rfc-editor.org/rfc/rfc3246.html
- iptables-extensions(8), DSCP target and dscp match: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- tc-pedit(8), pedit action and `ip dsfield`: https://man7.org/linux/man-pages/man8/tc-pedit.8.html
- tc-skbedit(8), skb metadata editing behavior: https://man7.org/linux/man-pages/man8/skbedit.8.html
- tc-u32(8), `match ip tos` / `match ip dsfield`: https://man7.org/linux/man-pages/man8/tc-u32.8.html
- tcpdump(8), verbose IPv4 ToS output: https://www.tcpdump.org/manpages/tcpdump.1.html
- ping(8), `-Q tos` option: https://man7.org/linux/man-pages/man8/ping.8.html

## Issues Found
- The `tc` marking example incorrectly used `action skbedit priority 0x6` as if it set the IP DSCP field. `skbedit priority` edits skb metadata/classification priority, not packet header data. Changed the example to use `action pedit ex munge ip dsfield set 0xb8 retain 0xfc`, which edits the IPv4 DS field and preserves ECN bits.
- The same `tc` example assumed an existing qdisc with handle `1:`. Added `tc qdisc add dev eth0 clsact` and attached the filter to `egress` so the example has a valid attachment point.
- The tcpdump comment said the command showed DSCP in decimal, but the command prints verbose packet lines containing the ToS field. Changed the comment to describe ToS details accurately.

## Review Notes
- The post uses iptables examples, which are still available on Ubuntu, often via the nftables-backed iptables frontend. A future update could mention native `nft` syntax, but the current commands are valid.
