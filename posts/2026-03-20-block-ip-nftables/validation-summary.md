# Validation Summary: How to Block an IP Address with nftables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- nftables
- Linux firewalling
- `nft` CLI
- IPv4 addressing and CIDR subnets
- Netfilter connection tracking

## Sources Consulted
- `nft(8)` man page: https://netfilter.org/projects/nftables/manpage.html
- Configuring chains - nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- Element timeouts - nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Element_timeouts
- Updating sets from the packet path - nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Updating_sets_from_the_packet_path
- Sets - nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Sets
- RFC 4632: Classless Inter-domain Routing (CIDR): https://www.rfc-editor.org/rfc/rfc4632

## Issues Found
- The early `nft add rule inet filter ...` examples required an existing `inet filter` table plus `input` and `output` base chains. I added a note making that prerequisite explicit, because nftables rules cannot be attached to chains that do not already exist.
- The `/16` example used `198.51.100.0/16`, which is not the canonical network address for that prefix length. I corrected it to `198.51.0.0/16`.
- The timeout section labeled the set as "dynamic" and used `flags dynamic, timeout`, but the example only manually adds timed elements. I changed it to a timeout-enabled set (`flags timeout; timeout 1h;`) and updated the wording/comment to match nftables terminology. In nftables, dynamic sets are specifically for updates from the packet path.
- The closing sentence claimed nftables sets can block thousands of IPs "with no performance degradation." That is too absolute. I rewrote it to the supported technical benefit: using one rule and a set instead of one rule per IP while keeping the ruleset compact.

## Review Notes
- Local `nft --check` validation could not be completed in this environment because `nft` requires netlink privileges here and returned `Operation not permitted`, so final validation relied on upstream netfilter documentation plus the local CLI version/help output.
- The post is correctly scoped to IPv4. Although it uses an `inet` table, the examples match only IPv4 traffic because they use `ip saddr` and `ip daddr`.
