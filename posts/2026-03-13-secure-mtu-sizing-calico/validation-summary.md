# Validation Summary: How to Secure MTU Sizing for Calico

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- Calico (CNI for Kubernetes)
- Kubernetes
- WireGuard (Calico encryption dataplane)
- Linux networking (MTU, IP fragmentation, sysctl, iptables)
- ICMP / PMTU discovery (RFC 792, RFC 1191)
- Calico GlobalNetworkPolicy (projectcalico.org/v3 API)
- Calico FelixConfiguration (`wireguardMTU` field)

## Sources Consulted
- Calico documentation — Configure MTU to maximize network performance (https://docs.tigera.io/calico/latest/networking/configuring/mtu) — confirms WireGuard overhead of 60 bytes (IPv4) / 80 bytes (IPv6), and that `wireguardMTU` is the correct FelixConfiguration field name.
- Calico documentation — GlobalNetworkPolicy reference (https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy) — confirms the `icmp.type` / `icmp.code` schema used in policy rules.
- Calico documentation — FelixConfiguration reference (https://docs.tigera.io/calico/latest/reference/resources/felixconfig) — confirms `wireguardMTU` field exists and the `calicoctl patch felixconfiguration default` invocation pattern.
- RFC 792 (Internet Control Message Protocol) — confirms ICMP type 3 code 4 is "Fragmentation Needed and Don't Fragment was Set".
- RFC 1191 (Path MTU Discovery) — confirms PMTU discovery relies on ICMP type 3 code 4 messages.
- Linux `iptables(8)` man page — confirms `-f` matches fragmented packets (second and further fragments) and `-j DROP` is valid for the FORWARD chain.
- Linux `sysctl` / `ip-sysctl.txt` documentation — `net.ipv4.conf.all.accept_source_route` controls acceptance of source-routed packets, NOT fragmentation behavior (this was the basis for the fix below).
- Calico WireGuard interface naming convention — confirms `wireguard.cali` is the correct interface name created by Felix when WireGuard is enabled.

## Issues Found
- **Mismatched comment and command for fragment forwarding.** The original example claimed to "Disable IP fragment forwarding if your pods don't need it" but used `sysctl -w net.ipv4.conf.all.accept_source_route=0`. That sysctl disables IP source routing, which is an unrelated feature — it has no effect on fragment forwarding. Replaced the snippet with `iptables -A FORWARD -f -j DROP`, which actually drops forwarded IPv4 fragments (second and further fragments) as the surrounding prose describes. Kept the existing "requires caution - test before applying" warning since dropping fragments can break legitimate traffic that relies on them.

## Review Notes
- The first bash snippet under "Prevent Fragmentation-Based Evasion" lists nodes and IPs but does not actually retrieve each node's MTU — it only prints a "Checking ..." line. This is presented as a starting scaffold rather than a complete check, which is acceptable for a tutorial, but readers should be aware they need to extend it (e.g., via `kubectl debug node/<name>` or SSH plus `ip link show`) to actually compare MTUs.
- The WireGuard overhead figure (60 bytes) is correct for IPv4. For IPv6 clusters the overhead is 80 bytes, so `wireguardMTU` should be host MTU − 80; the post does not call this out but the example is unambiguously IPv4-shaped.
- The Mermaid diagram uses `\n` for line breaks inside node labels. This is supported by current Mermaid renderers but `<br/>` is more portable across older renderers — not a correctness issue.
- `iptables -A FORWARD -f -j DROP` only covers IPv4. Clusters using IPv6 would also need an equivalent `ip6tables` rule (or nftables) to drop IPv6 fragments. Out of scope for the fix but worth noting for future revisions.
