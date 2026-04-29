# Validation Summary: How to Detect IPv6 Network Scanning

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6
- Neighbor Discovery Protocol (NDP)
- Suricata
- Sigma
- Splunk SPL
- Linux networking tools (`ip`, `nstat`, `ip6tables`)

## Sources Consulted
- RFC 7707: Network Reconnaissance in IPv6 Networks - https://www.rfc-editor.org/rfc/rfc7707.html
- RFC 4291: IP Version 6 Addressing Architecture - https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc4861
- RFC 4443: ICMPv6 for IPv6 Specification - https://www.rfc-editor.org/rfc/rfc4443
- IANA ICMPv6 Parameters - https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- Suricata Rules Format - https://docs.suricata.io/en/suricata-6.0.20/rules/intro.html
- Suricata Thresholding Keywords - https://docs.suricata.io/en/suricata-7.0.6/rules/thresholding.html
- Suricata `tcp.flags` keyword - https://docs.suricata.io/en/latest/rules/header-keywords.html
- Sigma Rules Specification - https://sigmahq.io/sigma-specification/specification/sigma-rules-specification.html
- Sigma Correlation Rules Specification - https://sigmahq.io/sigma-specification/specification/sigma-correlation-rules-specification.html
- Splunk `bin` command reference - https://docs.splunk.com/Documentation/Splunk/9.4.2/SearchReference/Bin
- Splunk `stats` / aggregate functions reference - https://help.splunk.com/en/splunk-enterprise/spl-search-reference/9.1/search-commands/stats
- Splunk `eval` / `case()` reference - https://help.splunk.com/en/splunk-enterprise/search/spl2-search-reference/eval-command/eval-command-usage
- Local CLI documentation checked during review: `man ip-neighbour`, `nstat --help`, `ip6tables -h`

## Issues Found
- Clarified that `ff02::1` is the all-nodes multicast address on the local link, not a general remote-scope probe target. Updated the table and introductory text accordingly.
- Fixed the Suricata ICMPv6 examples. The original rules used `alert icmp6`, which is not documented in Suricata's standard protocol header syntax, and one rule claimed to detect scanning of unique `/64` targets even though `threshold` only counts matches. I changed the rules to use `alert ip` with `ip_proto:58`, kept `itype:128`, and renamed the detection to high-rate ICMPv6 echo probing.
- Updated the TCP Suricata rule from `flags:S,12;` to the documented `tcp.flags:S,CE;` form and renamed it to SYN probing so the detection description matches what the rule actually measures.
- Replaced the NDP section's core claim. RFC 4861 shows `INCOMPLETE` neighbor-cache entries are created when the local host has a packet to send and starts address resolution, not when a target merely receives inbound Neighbor Solicitations. I replaced that script with a Linux `nstat`-based monitor for inbound `Icmp6InNeighborSolicits`, which is an actual local-link NDP discovery signal.
- Rewrote the Sigma example into valid Sigma syntax. The original snippet placed `count(dst_ip) by src_ip > 30` inside `detection`, which is not valid in standard Sigma rules. I replaced it with a base detection rule plus a Sigma correlation `value_count` rule using `group-by`, `timespan`, and `condition.field`.
- Corrected the auto-blocking script comments and parser. The original comments said it counted unique destinations in the last 5 minutes, but the code actually counted dropped log lines from today's log view and assumed `SRC=` was always field 11. I aligned the comments with the real behavior, extracted `SRC=` by pattern, and used `ip6tables -C` instead of grepping the rule listing.
- Corrected the conclusion. Suricata thresholding is IDS-side detection, not kernel-level detection, and the NDP conclusion now refers to bursts of inbound Neighbor Solicitations on local links instead of `INCOMPLETE` neighbor-cache growth.

## Review Notes
- The Splunk and Sigma field names in the post are schema-dependent (`network_type`, `src_ip`, `dst_ip`, `event.action`, `icmpv6_type`). The SPL and Sigma structures are valid, but real deployments may need field-name mapping.
- The `ip6tables` example is still technically valid on systems that ship the compatibility frontend, but many modern Linux deployments prefer `nftables` for new firewall automation.
- The revised Suricata examples intentionally stay with documented rate/count thresholding that is broadly compatible with stable rule syntax, rather than relying on newer version-specific distinct-count features.
