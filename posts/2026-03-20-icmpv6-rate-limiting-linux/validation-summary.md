# Validation Summary: How to Configure ICMPv6 Rate Limiting on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux kernel ICMPv6 sysctl settings
- `sysctl` and `/proc/sys`
- ICMPv6 / IPv6 networking
- `ip6tables`
- Python helper scripts
- `tcpdump`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 4443, Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc4443
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- IANA ICMPv6 Parameters registry: https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- `iptables-extensions(8)` reference for `limit` and `hashlimit`: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local runtime checks on the review host: `cat /proc/sys/net/ipv6/icmp/ratelimit`, `cat /proc/sys/net/ipv6/icmp/ratemask`, `sysctl net.ipv6.icmp.ratelimit net.ipv6.icmp.ratemask`, `ip6tables -p icmpv6 -h`, `ip6tables -m limit -h`, `ip6tables -m hashlimit -h`, and `grep -E 'Icmp6OutRateLimit|Icmp6OutMsgs|Icmp6OutErrors' /proc/net/snmp6`

## Issues Found
- `net.ipv6.icmp.ratemask` was described as a binary bitmask with a binary default value. Current Linux kernel documentation defines it as a comma-separated list of ICMPv6 type ranges, and the live kernel on the review host reports `0-1,3-127`. I updated the explanation, default value, and parsing example accordingly.
- The custom `ratemask` example used `26` as if the setting were a bitmask. On current Linux, the documented input format is a range list, so I replaced the example with `1,3-4` and updated the helper scripts to generate and verify that format.
- The post said `net.ipv6.icmp.ratelimit=1000` means one error per second per source. Kernel documentation describes this setting as the minimum spacing between rate-limited ICMPv6 messages, without the per-source guarantee. I corrected the wording throughout.
- The `ip6tables` section used `-m limit` while claiming per-source granularity, and it also showed blanket rate-limit/drop examples that would catch important ICMPv6 control traffic. I changed the example to explicitly allow critical ICMPv6 error types and to use `-m hashlimit --hashlimit-mode srcip` for actual per-source echo-request limiting.
- The monitoring example using `tcpdump | awk` counted every 10 packets, not packets over 10 seconds as the comment claimed. I replaced it with a 10-second sample using `timeout`.

## Review Notes
- `ip6tables` remains valid on modern Linux, but many current distributions implement it through the nftables backend. The reviewed host reports `ip6tables v1.8.10 (nf_tables)`, and the flags used in the corrected examples are accepted there.
- The kernel default `net.ipv6.icmp.ratemask` value `0-1,3-127` intentionally excludes ICMPv6 Type 2 (Packet Too Big), which aligns with operational guidance that PMTUD depends on these messages.
- The recommended `ratelimit` profiles are examples, not kernel defaults beyond `1000`, and should still be tuned to the host role and observed ICMPv6 volume.
