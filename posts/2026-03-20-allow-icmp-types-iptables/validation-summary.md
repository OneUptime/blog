# Validation Summary: How to Allow Specific ICMP Types Through iptables

## Status
validated

## Post Type
Guide

## Technologies Covered
- `iptables`
- ICMP for IPv4
- Linux firewall configuration
- `ping`
- `tracepath`
- `hping3`

## Sources Consulted
- `iptables-extensions(8)` man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `iptables(8)` man page: https://man7.org/linux/man-pages/man8/iptables.8.html
- `tracepath(8)` man page: https://man7.org/linux/man-pages/man8/tracepath.8.html
- `ping(8)` man page: https://man7.org/linux/man-pages/man8/ping.8.html
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792
- RFC 1191, Path MTU Discovery: https://www.rfc-editor.org/rfc/rfc1191
- RFC 1122, Requirements for Internet Hosts -- Communication Layers: https://www.rfc-editor.org/rfc/inline-errata/rfc1122.html
- `hping3(8)` Debian man page: https://manpages.debian.org/testing/hping3/hping3.8.en.html

## Issues Found
- The command shown for listing ICMP type names was inaccurate. `iptables-extensions(8)` documents that type names are shown by `iptables -p icmp -h`, so the post was updated from `iptables -p icmp --help 2>&1 | grep "icmp-type"` to `iptables -p icmp -h`.
- The comment saying `iptables -D INPUT -p icmp -j DROP` would "flush existing INPUT ICMP rules" was incorrect. `-D` deletes one matching rule; it does not flush a chain. The comment was corrected to describe what the command actually does.
- The "Allow pings only from your monitoring server" example was not correct when used after the earlier general `echo-request` accept rule, because other ping requests would still match that broader rule. The post now removes the broad `echo-request` accept before inserting the monitoring-only rule.
- The PMTUD verification example was not reliable. RFC 1191 depends on receiving ICMP Destination Unreachable, Code 4, and `tracepath(8)` is specifically documented to discover MTU along a path. The post now uses `tracepath 8.8.8.8` for that check.
- The `hping3` example used the wrong option name. The documented flag is `--icmptype`, not `--icmp-type`, so the command was corrected.
- The introduction and conclusion overstated the rule set as universally complete. They were narrowed to a host-focused, practical policy because routers or specialized systems may require additional ICMP types.

## Review Notes
- The post is technically accurate as an IPv4 host-focused `iptables` guide after the fixes above.
- Modern Linux distributions often run `iptables` on top of the `nf_tables` backend, and `nftables` is the long-term successor to `iptables`, but the commands in the post remain valid for current `iptables` users.
- The post covers IPv4 ICMP only. Equivalent IPv6 guidance would need `ip6tables` and different ICMPv6 requirements.
