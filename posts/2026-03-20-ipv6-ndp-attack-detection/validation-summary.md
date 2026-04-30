# Validation Summary: How to Detect NDP Attacks with SIEM

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP)
- ICMPv6 Router Advertisement and Neighbor Advertisement handling
- Suricata IDS rule syntax
- Linux `iproute2` neighbor monitoring
- Linux `nftables`
- Splunk SPL
- Prometheus alerting rules
- RA Guard

## Sources Consulted
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration - https://www.rfc-editor.org/rfc/rfc4862
- RFC 7113: Implementation Advice for IPv6 Router Advertisement Guard (RA-Guard) - https://www.rfc-editor.org/rfc/rfc7113
- Suricata Rules Format / Protocol documentation - https://docs.suricata.io/en/latest/rules/intro.html
- Suricata ICMP header keywords - https://docs.suricata.io/en/latest/rules/header-keywords.html
- Suricata payload keywords (`byte_test`) - https://docs.suricata.io/en/latest/rules/payload-keywords.html
- `ip-monitor(8)` Linux manual page - https://man7.org/linux/man-pages/man8/ip-monitor.8.html
- `ip-neighbour(8)` Linux manual page - https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- `nftables(8)` manual page - https://manpages.debian.org/testing/nftables/nftables.8.en.html
- Prometheus alerting rules documentation - https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Splunk `eval` command reference - https://help.splunk.com/splunk-enterprise/search/spl-search-reference/9.2/search-commands/eval

## Issues Found
- The Suricata examples used `icmp6` and `icmp6.hdr`, but the documented protocol and sticky-buffer names are `icmpv6` and `icmpv6.hdr`. I updated the rules to the current documented syntax and bumped the example rule revisions.
- The "All RA messages" signature only matched packets sent to `ff02::1`, which misses unicast Router Advertisements sent in response to Router Solicitations. I widened the destination match and clarified that the rule covers both multicast and unicast RAs.
- The cache-poisoning section said the rule detected "NA without prior NS", but the signature only inspected NA flags and rate. I reworded it as a heuristic and replaced the invalid header test with a valid `byte_test` against the Override flag at the correct ICMPv6 header offset.
- The Linux neighbor-monitoring script could read back prior `ALERT:` log lines as if they were raw `ip monitor` events, which could corrupt MAC comparison logic after the first alert. I restricted the monitor to IPv6 and filtered previous entries so only raw neighbor events are used for comparison.
- The NS-flood mitigation loop would insert the same nftables rule repeatedly every time the critical threshold was crossed. I changed it to add the rate-limit rule only once and only when the `ip6/filter/input` chain already exists.
- The DAD DoS Suricata rule overclaimed by saying it detected direct responses to DAD, while the signature only tested for bursts of NAs with the Solicited flag unset. I reframed it as a heuristic, constrained it to all-nodes destination traffic, and used a valid `byte_test` against the Solicited flag bit.

## Review Notes
- Thresholds such as `count 10, seconds 5`, `>500` incomplete entries, and the Splunk volume cutoffs are heuristics and will need tuning per network size and normal IPv6 behavior.
- The Prometheus alerting syntax is valid, but the metric names and labels are illustrative and depend on a custom exporter or textfile collector to exist exactly as shown.
- RA Guard remains a useful preventive control, but RFC 7113 documents evasion considerations, so the post is correct to position SIEM and IDS monitoring as additional detection layers rather than a replacement.
