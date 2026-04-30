# Validation Summary: How to Rate Limit ICMPv6 Messages

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMPv6
- IPv6 Neighbor Discovery
- Linux kernel sysctl (`/proc/sys/net/ipv6/*`)
- `ip6tables`
- `iptables` `limit` and `hashlimit` matches
- Python

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 4443, Internet Control Message Protocol (ICMPv6) for IPv6: https://www.rfc-editor.org/rfc/rfc4443.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- `ip6tables(8)` manual page: https://man7.org/linux/man-pages/man8/ip6tables.8.html
- `iptables-extensions(8)` manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local command help and man pages: `ip6tables -p icmpv6 -h`, `man iptables-extensions`

## Issues Found
- The post described `net.ipv6.icmp.ratemask` as a bitmask with a default covering types 1, 2, and 3. Current Linux kernel documentation describes it as a comma-separated list of ICMPv6 type ranges, and the default excludes Packet Too Big (type 2). I corrected the explanation and default example.
- The post treated `net.ipv6.neigh.default.gc_thresh1`, `gc_thresh2`, and `gc_thresh3` as Neighbor Discovery message rate-limit controls. They are neighbor-cache garbage-collection thresholds, not ICMPv6 rate-limit settings. I changed the text to describe their actual purpose.
- The `ip6tables` examples rate-limited and then dropped Neighbor Solicitation, Neighbor Advertisement, and Router Advertisement traffic. RFC 4861 and RFC 4890 treat these as core Neighbor Discovery messages required for normal IPv6 operation on the local link. I replaced those examples with accept rules and updated the surrounding explanation.
- The post said Packet Too Big should “never be rate-limited” without distinguishing inbound firewall handling from outbound kernel-generated ICMPv6 errors. I narrowed the statement to the technically correct point for the shown `INPUT` rules: inbound Packet Too Big messages should not be dropped or blanket rate-limited because PMTUD depends on them.
- The conclusion said Neighbor Solicitation and Neighbor Advertisement can be safely rate-limited. That was too broad for a generic host firewall guide. I updated the conclusion to recommend rate-limiting safer message types such as Echo Request while accepting essential Neighbor Discovery traffic on interfaces that rely on it.

## Review Notes
- The `ip6tables` syntax and the `limit` / `hashlimit` examples were validated against the installed command help and `iptables-extensions(8)`.
- The Python monitoring snippet is syntactically valid and works against `/proc/net/snmp6`; no code changes were required there.
- Current Linux documentation lists the ICMPv6 `ratelimit` default differently from many runtime systems in the field. The post now avoids hard-coding that default and instead explains the meaning of the value.
- Modern Linux distributions often provide `ip6tables` via the `nf_tables` backend, and new firewall development is generally encouraged to use native `nftables`. The `ip6tables` commands in this post remain valid, but that is a useful version-specific caveat for future updates.
