# Validation Summary: How to Rate Limit IPv6 Connections with ip6tables

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6
- `ip6tables`
- Netfilter match modules: `limit`, `hashlimit`, `recent`, `conntrack`
- ICMPv6 / Neighbor Discovery
- Linux firewalling

## Sources Consulted
- `man ip6tables(8)` on the local system (`ip6tables v1.8.10 (nf_tables)`)
- `man iptables-extensions(8)` on the local system
- RFC 4890, *Recommendations for Filtering ICMPv6 Messages in Firewalls*: https://datatracker.ietf.org/doc/rfc4890/
- RFC 4861, *Neighbor Discovery for IP version 6 (IPv6)*: https://datatracker.ietf.org/doc/html/rfc4861
- RFC 6583, *Operational Neighbor Discovery Problems*: https://datatracker.ietf.org/doc/rfc6583/
- Netfilter upstream `libxt_hashlimit` documentation: https://git.netfilter.org/iptables/tree/extensions/libxt_hashlimit.man?id=946397340806ca9f0bab7e0371668058e7a98de4
- Netfilter upstream `recent` history showing IPv6 support was added: https://git.netfilter.org/iptables/log/?h=v1.6.1&id=c3d0a7b800277fcc4401f19a584edf1d7dfaeda9

## Issues Found
- The post described the `recent` module as "connection tracking". That is inaccurate; `recent` tracks recent source or destination addresses independently of conntrack. I corrected the description and updated the SSH example to match only `NEW` connections so the hit counter reflects connection attempts instead of all SSH packets.
- The SSH logging example was technically broken. As written, it logged packets that were still under the hashlimit and then dropped every new SSH connection. I changed it so it logs only the remaining over-limit `NEW` attempts after the earlier SSH allow rule, then drops them.
- The ICMPv6 flood section advised rate-limiting and dropping all ICMPv6 traffic. That is unsafe for IPv6 because essential ICMPv6 types are required for Neighbor Discovery and Path MTU Discovery per RFC 4890. I narrowed the examples to `echo-request` traffic instead.
- The Neighbor Discovery section misdescribed the exhaustion scenario as incoming Neighbor Solicitations causing unreachable messages. RFC 6583 describes the common router problem as scans to unused destination addresses causing address-resolution work and neighbor-cache churn. I corrected the explanation and clarified that the example only covers local-link Neighbor Solicitation flooding.
- The hashlimit inspection commands were wrong. `/proc/net/ip6_tables_matches` lists loaded matches, not live hashlimit tables. I replaced that section with the actual IPv6 proc path for hashlimit state, `/proc/net/ip6t_hashlimit/`.

## Review Notes
- The examples use valid current `ip6tables` syntax, but on many modern Linux systems `ip6tables` is the nftables-backed frontend rather than the long-term preferred native interface.
- The rate-limiting examples assume a broader firewall policy exists around them, especially an `ESTABLISHED,RELATED` accept rule where appropriate.
- RFC 4890 treats even ICMPv6 echo messages as traffic that generally should not be dropped on local interfaces, so echo-request limiting is an operational tradeoff rather than a universal best practice.
- Neighbor Solicitation rate limiting is situational and can interfere with normal Neighbor Discovery if configured too aggressively.
