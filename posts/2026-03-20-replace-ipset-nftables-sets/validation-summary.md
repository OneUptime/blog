# Validation Summary: How to Replace ipset with nftables Sets

## Status
validated

## Post Type
Guide

## Technologies Covered
- nftables
- ipset
- iptables
- Linux firewall configuration
- Netfilter sets and concatenations

## Sources Consulted
- Netfilter nftables man page: https://netfilter.org/projects/nftables/manpage.html
- nftables wiki, Sets: https://wiki.nftables.org/wiki-nftables/index.php/Sets
- nftables wiki, Concatenations: https://wiki.nftables.org/wiki-nftables/index.php/Concatenations
- nftables wiki, Moving from ipset to nftables: https://wiki.nftables.org/wiki-nftables/index.php/Moving_from_ipset_to_nftables
- nftables wiki, Configuring tables: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_tables
- nftables wiki, Configuring chains: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- nftables wiki, Quick reference-nftables in 10 minutes: https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes
- ipset official man page: https://ipset.netfilter.org/ipset.man.html
- iptables-extensions(8), set match module: https://www.man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
- The introduction claimed nftables sets support "all ipset types". I changed this to "common ipset use cases" because the official nftables documentation shows direct coverage for many ipset patterns, especially via concatenations, but does not support a blanket one-to-one claim for every ipset feature.
- The comparison table described nftables persistence as `nft list ruleset`. I changed this to a ruleset-file workflow using `nft list ruleset` and `nft -f`, which matches the official man page's export/load behavior.
- The standalone `nft add set` and `nft add rule` snippets did not state that the `inet filter` table and `input` base chain must already exist. I added that prerequisite comment so the examples are technically complete.

## Review Notes
- The full `table inet filter { ... }` example is self-contained and uses valid named-set and interval-set syntax.
- The IP + port allowlist example is valid as written: the set stores `ipv4_addr . inet_service`, while the rule's `tcp dport` selector provides the protocol context for the match.
- Live `nft -c` validation was not possible in this environment because the session does not have the netlink permissions required by `nft`, so command verification relied on the official Netfilter documentation and manual pages.
