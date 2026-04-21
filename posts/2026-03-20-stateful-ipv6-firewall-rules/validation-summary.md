# Validation Summary: How to Configure Stateful IPv6 Firewall Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv6
- Linux Netfilter connection tracking (conntrack)
- ip6tables
- nftables
- ICMPv6 filtering
- Linux conntrack sysctl tuning

## Sources Consulted
- iptables-extensions(8) conntrack match documentation: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- nftables connection tracking documentation: https://wiki.netfilter.org/wiki-nftables/index.php/Matching_connection_tracking_stateful_metainformation
- nftables packet header matching documentation: https://wiki.nftables.org/wiki-nftables/index.php/Matching_packet_headers
- nftables official man page: https://netfilter.org/projects/nftables/manpage.html
- conntrack-tools manual and conntrack(8) documentation: https://conntrack-tools.netfilter.org/manual.html and https://conntrack-tools.netfilter.org/conntrack.html
- Linux kernel nf_conntrack sysctl documentation: https://www.kernel.org/doc/html/v6.6/networking/nf_conntrack-sysctl.html
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://datatracker.ietf.org/doc/rfc4890/
- Author profile link: https://github.com/nawazdhandala

## Issues Found

1. **Oversimplified conntrack state definitions**: Updated `NEW` and `ESTABLISHED` to match the official conntrack meaning: `NEW` covers traffic for a connection that has not yet seen both directions, while `ESTABLISHED` means conntrack has seen traffic in both directions.

2. **ip6tables example dropped essential ICMPv6**: Added explicit ICMPv6 allow rules for error messages and Neighbor Discovery before the final drop rule. Without these, the example could break normal IPv6 operation, including path MTU discovery and neighbor/router discovery.

3. **nftables ICMPv6 matching used `ip6 nexthdr`**: Replaced `ip6 nexthdr icmpv6 icmpv6 type ...` with direct `icmpv6 type ...` matches. nftables documents that `ip6 nexthdr` only checks the immediate IPv6 next-header field and can miss packets with extension headers; `icmpv6 type` creates the appropriate layer-4 dependency.

4. **Neighbor Discovery source restriction was too narrow**: Removed the `ip6 saddr fe80::/10` restriction from the nftables Neighbor Discovery rule because Neighbor Solicitation and Neighbor Advertisement packets are not limited to link-local source addresses in all valid cases.

5. **Misleading ICMPv6 echo conntrack comment**: Changed the comment to say conntrack tracks the request/reply pair instead of implying both echo requests and replies are `ESTABLISHED`.

6. **Incorrect conntrack sample output**: Changed the sample output for `conntrack -L -f ipv6` to start with `tcp` instead of `ipv6`, matching conntrack's non-extended output format. This keeps the later `awk '{print $4}'` state-count command accurate.

## Review Notes
- Local checks confirmed the ip6tables examples translate correctly with `ip6tables-translate` from iptables v1.8.10.
- `nft -c` parsed the nftables snippets far enough to reach netlink cache initialization, but full check/application was blocked by lack of netlink permissions in this environment.
- The `conntrack` binary was not installed locally, so conntrack CLI syntax was verified against upstream conntrack-tools documentation and current distro man pages.
- The sysctl names and the default TCP established timeout of 432000 seconds match Linux kernel nf_conntrack documentation.
