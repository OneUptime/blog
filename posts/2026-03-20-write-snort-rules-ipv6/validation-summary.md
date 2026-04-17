# Validation Summary: How to Write Snort Rules for IPv6 Traffic

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Snort 3 IDS rule language
- IPv6 addressing and extension headers
- ICMPv6 (RFC 4443, RFC 4861)
- DNS AAAA record queries (RFC 3596)
- tcpdump (for PCAP capture)

## Sources Consulted
- Snort 3 Rule Writing Guide — https://docs.snort.org/rules/headers/protocols
- Snort 3 source code — https://github.com/snort3/snort3 (specifically `src/ips_options/`, `src/codecs/ip/cd_icmp6.cc`, `src/loggers/alert_csv.cc`, `src/main/snort_module.cc`, `src/protocols/ipv6.h`)
- RFC 4443 — Internet Control Message Protocol (ICMPv6)
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6)
- RFC 5095 — Deprecation of Type 0 Routing Headers in IPv6
- RFC 3596 — DNS Extensions to Support IPv6 (AAAA record = type 28)
- IANA Assigned Internet Protocol Numbers (for IPv6 extension header protocol numbers: 0, 43, 44, 60)

## Issues Found

1. **Invalid `ip6` protocol keyword.** Snort 3 accepts only four protocol names in rule headers: `ip`, `icmp`, `tcp`, `udp`. The keyword `ip6` does not exist. `ip` matches both IPv4 and IPv6.
   - Fix: replaced `alert ip6 ...` with `alert ip ...` throughout the post.

2. **Invalid `icmp6` protocol keyword.** Same reason — Snort 3 has no `icmp6`. ICMPv6 packets are handled by the generic `icmp` keyword (ICMPv6 packets set `PktType::ICMP` in the decoder).
   - Fix: replaced `alert icmp6 ...` with `alert icmp ...`, and added `ip_proto:58;` (ICMPv6 protocol number) to each ICMPv6 rule so that the rule narrows correctly to ICMPv6 and does not fire on ICMPv4 packets whose type number happens to overlap (e.g. ICMPv4 type 3 = Destination Unreachable vs ICMPv6 type 3 = Time Exceeded).

3. **Non-existent `ip6_hdr` rule option.** Snort 3 does not have an `ip6_hdr` keyword, and the listed values (`hopopts`, `routeopt`, `dst`, `frag`) are not recognized. Extension-header matching is done via the standard `ip_proto` keyword using the next-header protocol number.
   - Fix: rewrote the "IPv6 Extension Header Rules" section to use `ip_proto:0` (Hop-by-Hop Options), `ip_proto:43` (Routing), `ip_proto:44` (Fragment), and `ip_proto:60` (Destination Options). Since `ip_proto` takes a single value (not a comma-separated list), the third rule was split into two individual rules (fragment and destination options) rather than one invalid multi-value rule.

4. **Closing paragraph mis-described the feature set.** Said Snort 3 supports "`ip6_hdr` for extension header matching"; it does not.
   - Fix: updated the closing paragraph to describe the actual mechanism (`ip_proto` for next-header matching; `ip`/`icmp` as unified protocol keywords; `itype`/`icode` for ICMPv6 types).

5. **Introduction similarly overstated dedicated IPv6 keywords.**
   - Fix: reworded the opening paragraph to reflect how Snort 3 actually handles IPv6 (through `ip`/`icmp` plus `ip_proto`).

Items verified and correct (no changes):
- `-T` flag for config test, `--rule` for inline rule, `-A alert_csv` logger module, `--rule-path` option.
- ICMPv6 type numbers (2 = Packet Too Big, 3 = Time Exceeded / code 0, 134 = Router Advertisement, 135 = Neighbor Solicitation).
- DNS AAAA query type = 0x001C (28 decimal).
- `detection_filter`, `content`, `flow`, `fast_pattern`, `http_uri`, `offset`, `depth`, `nocase` syntax.
- IPv6 CIDR notation in rule headers (e.g. `2001:db8::/32`, `[::1]`).

## Review Notes

- The ICMPv6 rules in the post rely on `$HOME_NET` being configured with IPv6 ranges (the Snort default `HOME_NET` is often IPv4-only). Readers deploying these rules should ensure their `snort.lua` defines an IPv6-inclusive `HOME_NET` variable; otherwise the rules will never match.
- `ip_proto` matches the *packet's* final protocol value. For IPv6 packets with extension headers, Snort's decoder walks the chain, so `ip_proto:58` correctly matches ICMPv6 and `ip_proto:0/43/44/60` match when the respective extension header is present. This behavior is documented in the Snort 3 decoder, but is worth noting for readers building more complex chained-header rules.
- The "SSH version scanning" rule uses `flow:to_server,established;` followed by `content:"SSH-"; depth:4;` — the SSH banner is actually sent by the server first, so for banner-grab detection the intent may be better served with `flow:to_client,established;`. Left as-is since it's a stylistic/intent question, not a syntax error.
- The post does not mention Snort 2.x vs 3.x rule-language differences. Some of these rules (notably the now-removed `ip6_hdr` keyword) would have been closer to valid Snort 2 syntax; readers migrating older rules should be aware of the conversion.
