# Validation Summary: How to Create a Stateful Firewall with nftables Connection Tracking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- nftables
- Linux Netfilter connection tracking
- conntrack-tools CLI
- Linux sysctl netfilter tuning
- IPv6 Neighbor Discovery

## Sources Consulted
- Netfilter nftables man page: https://netfilter.org/projects/nftables/manpage.html
- nftables wiki, Matching connection tracking stateful metainformation: https://wiki.nftables.org/wiki-nftables/index.php/Matching_connection_tracking_stateful_metainformation
- nftables wiki, Simple ruleset for a workstation: https://wiki.nftables.org/wiki-nftables/index.php/Simple_ruleset_for_a_workstation
- Netfilter conntrack(8) man page: https://www.netfilter.org/projects/conntrack-tools/conntrack-manpage.html
- conntrack-tools user manual: https://conntrack-tools.netfilter.org/manual.html
- Linux kernel documentation, Netfilter Conntrack Sysfs variables: https://docs.kernel.org/networking/nf_conntrack-sysctl.html
- Local nftables documentation and tooling: `man nft`, `nft --version`, and `nft describe ct_state`

## Issues Found
- The connection tracking state descriptions were oversimplified. `new` is not only the first packet; it covers packets for flows seen in one direction so far. `established` requires traffic in both directions, and `invalid` means the packet does not follow expected conntrack behavior. Updated the table to match nftables documentation.
- The `inet` table example dropped essential IPv6 Neighbor Discovery traffic. Added an `icmpv6 type { nd-neighbor-solicit, nd-router-advert, nd-neighbor-advert } accept` rule so the dual-stack firewall example does not break basic IPv6 connectivity.
- The `conntrack -F` warning said it "drops all sessions." The command flushes the connection tracking table; with stateful firewall rules this may disrupt active sessions, but the command does not directly kill every session. Updated the wording accordingly.

## Review Notes
The nftables rule syntax matches the documented `inet` table, filter base chain, priority, policy, and `ct state` forms. Local `nft -c` checks reached netlink permission errors in this unprivileged environment, but did not report parser errors. The `conntrack` binary was not installed locally, so CLI options were verified against the official Netfilter conntrack man page and conntrack-tools manual.
