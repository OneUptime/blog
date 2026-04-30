# Validation Summary: How to Run iptables Rules Inside a Network Namespace

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux network namespaces
- `iproute2` / `ip netns`
- `iptables`
- `nftables`
- Netfilter connection tracking and rate limiting
- Linux NAT / `MASQUERADE`

## Sources Consulted
- `network_namespaces(7)` — https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- `ip-netns(8)` — https://man7.org/linux/man-pages/man8/ip-netns.8.html
- `veth(4)` — https://man7.org/linux/man-pages/man4/veth.4.html
- `iptables(8)` — https://man7.org/linux/man-pages/man8/iptables.8.html
- `iptables-extensions(8)` — https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- nftables wiki: Configuring chains — https://wiki.netfilter.org/wiki-nftables/index.php/Configuring_chains
- nftables wiki: Quick reference — https://wiki.netfilter.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes
- nftables wiki: Matching connection tracking stateful metainformation — https://wiki.netfilter.org/wiki-nftables/index.php/Matching_connection_tracking_stateful_metainformation

## Issues Found
- The introduction said host rules do not affect namespaces "and vice versa" without qualification. I corrected this to distinguish ruleset configuration from packet traversal: host commands change only the host ruleset, namespace commands change only that namespace's ruleset, but traffic that traverses both can still be filtered in both places.
- The SSH rate-limiting example conflicted with the earlier unconditional SSH `ACCEPT` rule if a reader followed the post top-to-bottom, because the earlier allow rule would match first and make the later rate-limit ineffective. I corrected the text to state that the rate-limited rules should replace the plain SSH allow rule, and I updated the example to use `-m conntrack --ctstate NEW`.
- The host-independence example claimed that the host "can still receive port 80 traffic" and tried to prove that with `iptables -L INPUT -n | grep 80`. That command only inspects one host chain and does not establish end-to-end reachability. I changed the example so it correctly demonstrates separate ruleset inspection instead of implying host port 80 is reachable.
- The conclusion repeated the same overstatement about full independence from the host. I corrected it to say the rulesets are configured independently while traffic can still be filtered in both places when it traverses both network stacks.

## Review Notes
- The post is technically sound after the fixes above. The core mechanism, `ip netns exec <namespace> ...`, is correct and aligns with `ip-netns(8)`.
- The `MASQUERADE` example is valid in `nat`/`POSTROUTING`, but in real deployments it still depends on the broader routing and forwarding setup around the namespace.
- The nftables example is syntactically aligned with current nftables documentation, though it intentionally shows only a minimal input chain and not a full production firewall policy.
