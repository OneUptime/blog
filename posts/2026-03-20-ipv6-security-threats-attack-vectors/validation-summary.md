# Validation Summary: How to Understand IPv6 Security Threats and Attack Vectors

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6 and Neighbor Discovery Protocol (NDP)
- Router Advertisements and SLAAC
- IPv6 extension headers and fragmentation
- IPv6 transition tunneling mechanisms (`6in4`, `ISATAP`, `Teredo`)
- Linux networking and firewall tooling (`tcpdump`, `ping`, `ip`, `iptables`, `ip6tables`)

## Sources Consulted
- RFC 3756: IPv6 Neighbor Discovery (ND) Trust Models and Threats — https://www.rfc-editor.org/rfc/rfc3756
- RFC 3971: SEcure Neighbor Discovery (SEND) — https://www.rfc-editor.org/rfc/rfc3971
- RFC 4213: Basic Transition Mechanisms for IPv6 Hosts and Routers — https://www.rfc-editor.org/rfc/rfc4213
- RFC 4291: IPv6 Addressing Architecture — https://www.rfc-editor.org/rfc/rfc4291
- RFC 4380: Teredo: Tunneling IPv6 over UDP through Network Address Translations (NATs) — https://www.rfc-editor.org/rfc/rfc4380
- RFC 4443: ICMPv6 (ICMP for IPv6) — https://www.rfc-editor.org/rfc/rfc4443
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) — https://www.rfc-editor.org/rfc/rfc4861
- RFC 5722: Handling of Overlapping IPv6 Fragments — https://www.rfc-editor.org/rfc/rfc5722
- RFC 6105: IPv6 Router Advertisement Guard — https://www.rfc-editor.org/rfc/rfc6105
- RFC 6620: FCFS SAVI: First-Come, First-Served Source Address Validation Improvement for Locally Assigned IPv6 Addresses — https://www.rfc-editor.org/rfc/rfc6620
- RFC 6946: Processing of IPv6 "Atomic" Fragments — https://www.rfc-editor.org/rfc/rfc6946
- RFC 7113: Implementation Advice for IPv6 Router Advertisement Guard (RA-Guard) — https://www.rfc-editor.org/rfc/rfc7113
- RFC 7217: A Method for Generating Semantically Opaque Interface Identifiers with IPv6 Stateless Address Autoconfiguration (SLAAC) — https://www.rfc-editor.org/rfc/rfc7217
- RFC 7707: Network Reconnaissance in IPv6 Networks — https://www.rfc-editor.org/rfc/rfc7707
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification — https://www.rfc-editor.org/rfc/rfc8200
- Local CLI validation against installed tools: `tcpdump -d`, `ping -h`, `ping6 -h`, `ip -6 neigh help`, `iptables -h`, `ip6tables -h`, `ip6tables -p icmpv6 -h`, `iptables-translate`, and `ip6tables-translate`

## Issues Found
- The NDP spoofing section incorrectly listed `RA-Guard` as a mitigation. I changed it to `IPv6 Source Guard` and `SEND`, because `RA-Guard` filters Router Advertisements rather than Neighbor Advertisements.
- The Hop-by-Hop header DoS description said attackers can force all routers to process HbH headers. I changed this to slower-path/extra-processing language because RFC 8200 explicitly allows nodes to ignore, drop, or slow-path HbH traffic.
- The atomic fragment explanation did not match RFC 6946. I replaced it with the correct description of atomic fragments as packets carrying a Fragment header with offset `0` and `M=0`, and noted the receiver-side handling issue RFC 6946 addresses.
- The overlapping fragment text implied ambiguous reassembly remains normal behavior. I corrected it to note that RFC 5722 requires overlapping fragments to be dropped during reassembly.
- The tunneling example incorrectly used `ip6tables -p 41` for an IPv6-in-IPv4 case. I removed that rule and clarified that protocol `41` here is an IPv4 encapsulation case handled by `iptables`.
- The reconnaissance section was too absolute. I changed the wording from "prevents" / "impossible" to "far less feasible" / "operationally infeasible", which aligns with RFC 7707's discussion of heuristics and non-brute-force scanning.
- The reconnaissance bullet about neighbor-table inspection needed scope clarification. I changed it to `Local-link NDP cache inspection` because that technique is relevant to local attackers or compromised local systems, not generic remote scanning.
- The multicast amplification mitigation said to filter `ff02::1` traffic "on perimeter". I corrected this to local hosts or links because `ff02::1` is the link-local all-nodes multicast address.
- The multicast example used `ping6`; I updated it to `ping -6`, which matches the current iputils CLI while preserving the same behavior.
- The common mitigation table had two over-broad items. I replaced `radvd monitoring` with monitoring for unauthorized RAs, and replaced blanket fragment dropping guidance with RFC 5722-compliant handling plus suspicious-fragment filtering.

## Review Notes
- The packet-capture filters for ICMPv6 types `134` and `136` were syntax-checked locally with `tcpdump -d`.
- The firewall commands were syntax-checked locally with `iptables-translate` and `ip6tables-translate`.
- The Linux firewall examples still use `iptables`/`ip6tables`, which remain valid on systems using the xtables frontend, though some modern environments prefer native `nftables` syntax.
