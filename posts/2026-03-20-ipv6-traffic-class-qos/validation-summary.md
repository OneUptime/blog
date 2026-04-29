# Validation Summary: How to Use the IPv6 Traffic Class Field for QoS

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- QoS / DiffServ
- DSCP
- ECN
- Linux `tc`
- Linux `ip6tables`
- Python `socket`
- Cisco IOS QoS policy syntax
- `tcpdump` / libpcap filters

## Sources Consulted
- RFC 8200: IPv6 Specification - https://www.rfc-editor.org/rfc/rfc8200
- RFC 2474: Definition of the Differentiated Services Field - https://www.rfc-editor.org/rfc/rfc2474.html
- RFC 3168: Explicit Congestion Notification (ECN) - https://www.rfc-editor.org/rfc/rfc3168
- RFC 4594: Configuration Guidelines for DiffServ Service Classes - https://www.rfc-editor.org/rfc/rfc4594.html
- IANA DSCP Registry - https://www.iana.org/assignments/dscp-registry/dscp-registry.xhtml
- Python `socket` documentation - https://docs.python.org/3/library/socket.html
- `tc-skbedit(8)` - https://man7.org/linux/man-pages/man8/tc-skbedit.8.html
- `tc-pedit(8)` - https://man7.org/linux/man-pages/man8/tc-pedit.8.html
- `tc-flower(8)` - https://man7.org/linux/man-pages/man8/tc-flower.8.html
- `pcap-filter(7)` - https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Local CLI help from `ip6tables v1.8.10 (nf_tables)` using `ip6tables -j DSCP --help`

## Issues Found
- The DSCP use-case table contained several inaccurate or non-standard mappings. I corrected the examples to align with RFC 4594 guidance, including CS2 as OAM/management, CS5 as signaling, EF as telephony/voice, and CS7 as reserved/internal use rather than general network management.
- The original `tc` example used `action skbedit priority 0 mark 0xB8`, which changes packet metadata and firewall marks, not the IPv6 Traffic Class field itself. I replaced it with a `flower` + `pedit` example that explicitly sets `ip6 traffic_class` to `0xB8`.
- The `tcpdump` byte filters treated `ip6[1]` as though it were the full Traffic Class byte. In IPv6, Traffic Class spans the low nibble of the first header byte and the high nibble of the second. I replaced the filters with correct libpcap expressions, including an EF match that works regardless of ECN bits.
- The Python example documented a DSCP range of `0-63` but did not enforce it. I added a range check so the function cannot accidentally set invalid values that would spill into ECN bits.
- The conclusion overstated the meaning of the CS codepoints by describing them generically as "bulk traffic". I updated it to reflect their broader and more accurate use for signaling and network-control style traffic classes.

## Review Notes
- On many modern Linux distributions, `ip6tables` is provided by the nftables compatibility layer (`iptables-nft`). The commands in the post remain valid, but new deployments may prefer native `nft` rules.
- The Cisco IOS example syntax is valid for matching DSCP values carried by IPv4 or IPv6 packets.
