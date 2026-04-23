# Validation Summary: How to Rate Limit IPv6 Connections with nftables

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- nftables
- ICMPv6
- Neighbor Discovery Protocol (NDP)
- Linux packet filtering

## Sources Consulted
- nftables `nft(8)` man page: https://netfilter.org/projects/nftables/manpage.html
- nftables wiki, Meters: https://wiki.nftables.org/wiki-nftables/index.php/Meters
- nftables wiki, Matching packet headers: https://wiki.nftables.org/wiki-nftables/index.php/Matching_packet_headers
- nftables wiki, Flowtables: https://wiki.nftables.org/wiki-nftables/index.php/Flowtables
- nftables wiki, Configuring chains: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861.html
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- Red Hat Enterprise Linux 8, Getting started with nftables / meter inspection examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/getting-started-with-nftables_configuring-and-managing-networking

## Issues Found
- Replaced `ip6 nexthdr ... icmpv6` matches with `icmpv6 type ...` matches. The nftables wiki warns that `ip6 nexthdr` only matches the immediate next header and can miss IPv6 packets that carry extension headers.
- Fixed the per-source `meter` examples so exceeded SSH and HTTP traffic is explicitly dropped instead of falling through. nftables base chains default to `policy accept` if no policy is set, so the original examples would not reliably enforce the stated limits.
- Corrected the flowtable section. Flowtables are a forwarding fastpath/offload feature, not a per-source rate-tracking or rate-limiting mechanism. The section text and example were updated accordingly.
- Removed the `ip6 saddr fe80::/10` restriction from the Neighbor Solicitation rule in the complete ruleset and added the missing burst value. RFC 4862 specifies that Duplicate Address Detection uses Neighbor Solicitations with the unspecified source address `::`, so the original rule could block valid DAD traffic.
- Changed `flush table ip6 rate-control` to `destroy table ip6 rate-control` in the standalone ruleset so the script does not fail on the first load when the table does not already exist.
- Corrected the meter inspection command from `nft list meters ip6 rate-control` to `nft list meter ip6 rate-control ssh-rate` and updated the sample output format to match current nftables meter output.

## Review Notes
- `meter` commands are still accepted, but nftables internally represents them via dynamic set infrastructure; this is why `list meter` and `flush meter` behave like compatibility commands around the underlying set representation.
- Flowtables only apply to forwarded traffic and are not relevant for protecting a host's local `input` chain from brute-force or flood traffic.
- ICMPv6 and NDP rate limits should be tuned conservatively in production. Overly aggressive values can interfere with legitimate control-plane traffic on busy links.
