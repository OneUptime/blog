# Validation Summary: How to Write Suricata Rules for IPv6 Traffic

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Suricata IDS/IPS rule language
- IPv6 protocol (RFC 8200) and extension headers
- ICMPv6 (RFC 4443, RFC 4861) — Neighbor Discovery, Router Advertisement
- Suricata `decode-event` keyword
- Suricata `itype`, `flow`, `threshold`, `metadata`, `flags`, `content` keywords
- `suricata-update` ruleset management tool
- Emerging Threats (et/open) and ptresearch/attackdetection rule sources

## Sources Consulted
- [Suricata Rules Format docs](https://docs.suricata.io/en/latest/rules/intro.html) — for valid protocol names
- [Suricata Header Keywords docs](https://github.com/OISF/suricata/blob/main/doc/userguide/rules/header-keywords.rst)
- [Suricata Meta Keywords docs](https://docs.suricata.io/en/latest/rules/meta.html) — metadata syntax
- [OISF Suricata decoder-events.rules](https://github.com/OISF/suricata/blob/main/rules/decoder-events.rules) — official decode-event names
- RFC 4443 (ICMPv6), RFC 4861 (Neighbor Discovery), RFC 5095 (deprecation of Routing Header Type 0)

## Issues Found

1. **Invalid protocol name `icmp6`** — Suricata's accepted protocol name is `icmpv6`, not `icmp6`. Per the official rule protocol list (verified via Suricata docs), only `icmpv6` is valid in the rule header. Replaced all occurrences (rules 300, 301, 302) with `icmpv6`. Also fixed a stray `ICMP6` in a comment to `ICMPv6`.

2. **Invalid keyword `ip6-exthdr`** — There is no `ip6-exthdr` keyword in Suricata. The author appears to have invented this syntax. The official mechanism for detecting IPv6 extension header conditions is the `decode-event` keyword with names defined in `decoder-events.rules`. Replaced the three rules (sids 200, 201, 202) with the actual decode-event keywords:
   - `ip6-exthdr:hopopts` → `decode-event:ipv6.hopopts_unknown_opt` (detects unknown HBH options, which is the security-relevant case)
   - `ip6-exthdr:rh,type 0` → `decode-event:ipv6.rh_type_0` (matches OISF's bundled SID 2200093 rule for RH0)
   - `ip6-exthdr:frag` → `decode-event:ipv6.frag_overlap` (detects fragmentation overlap attacks; removed the now-irrelevant threshold)
   Also updated the closing paragraph to reference `decode-event` instead of the invented keyword.

## Review Notes

- The `ipv6` protocol name in the rule header is valid (an alias for `ip6`) — verified, no change needed.
- The `metadata:tag ipv6-webapp;` syntax follows the documented `metadata: key value;` format (key=`tag`, value=`ipv6-webapp`) and is technically valid, though the `tag` key has no special semantics here.
- The `flags:S` keyword for matching SYN-only TCP packets is correct syntax.
- The threshold/track/count/seconds syntax used throughout is current and valid.
- `ping6` is deprecated in modern iputils in favor of `ping -6`, but `ping6` is still widely available on most distributions and was kept as-is.
- Suricata supports backslash line continuation in rules files, so the multi-line examples are syntactically valid.
- For pure detection of *presence* of an extension header (not anomaly), users could alternatively use `ip_proto:43` (routing), `ip_proto:44` (fragment), `ip_proto:0` (HBH), but the decode-event approach better matches the security intent stated in the original rule messages.
- The decode-event-based replacement rules are aligned with the kinds of rules shipped in OISF's bundled `decoder-events.rules` file.
