# Validation Summary: How to Configure ip6tables to Block All IPv6 Traffic Except Allowed

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Linux `ip6tables`
- IPv6 ICMPv6 and Neighbor Discovery
- Netfilter connection tracking
- `at`, `atq`, and `atrm`

## Sources Consulted
- Netfilter `ip6tables(8)` and `iptables-extensions(8)` from the installed `iptables` 1.8.10 package in this environment
- Netfilter project homepage: https://www.netfilter.org/projects/iptables/index.html
- RFC 4443, Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc4443
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- Debian `at` / `atq` / `atrm` man page: https://manpages.debian.org/bookworm/at/atrm.1.en.html

## Issues Found
- The example management and app-server prefixes used `fd00:mgmt::/48` and `2001:db8:app::/64`, which are invalid IPv6 prefixes because `mgmt` and `app` are not hexadecimal. I replaced them with valid documentation and ULA prefixes.
- The Neighbor Discovery rules incorrectly treated Router Solicitation, Neighbor Solicitation, and Neighbor Advertisement as link-local-source-only INPUT traffic. For host firewalls, Router Solicitation is not a required INPUT rule, Neighbor Solicitation can legitimately use the unspecified source address during Duplicate Address Detection, and Neighbor Advertisement is not limited to `fe80::/10`. I replaced those rules with RFC-aligned checks that validate hop limit 255 and keep Router Advertisements link-local.
- The database template used `OUTPUT DROP` but did not allow the outbound Router Solicitation and Neighbor Discovery traffic needed for router and neighbor discovery, and it incorrectly restricted outbound NS/NA by source prefix. I added the needed outbound ICMPv6 rules there.
- The rollback example cancelled whichever job appeared last in `atq`, which may not be the revert job created by the snippet, and it did not restore `OUTPUT` to `ACCEPT`. I changed it to capture the specific job ID returned by `at` and reset `OUTPUT` as well.
- The reset snippet said it flushed "all rules", but the commands shown only operate on the default filter table. I corrected that wording.
- The summary overstated the required ICMPv6/NDP INPUT set and implied that Packet Too Big must always be allowed in `FORWARD`, even on systems that are not forwarding traffic. I corrected the explanation.

## Review Notes
- The commands and flags used in the corrected post match the installed `ip6tables` frontend in this environment, which reports `ip6tables v1.8.10 (nf_tables)`.
- I verified the corrected firewall commands with `ip6tables-translate` and `ip6tables-restore-translate`, and I syntax-checked the rollback shell snippet with `bash -n`.
- `ip6tables-restore --test` was not usable in this environment without root privileges, so full non-privileged validation relied on the translate frontends instead.
