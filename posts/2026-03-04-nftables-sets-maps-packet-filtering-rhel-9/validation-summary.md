# Validation Summary: How to Configure nftables Sets and Maps for Efficient Packet Filtering on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- nftables
- nft CLI
- nftables sets
- nftables maps and verdict maps
- Dynamic sets, timeouts, intervals, and concatenations

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring firewalls and packet filters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/index
- nftables wiki, "Sets": https://wiki.nftables.org/wiki-nftables/index.php/Sets
- nftables wiki, "Meters": https://wiki.nftables.org/wiki-nftables/index.php/Meters
- Local `nft` man page and CLI help for nftables v1.0.9

## Issues Found
- The dynamic rate-limit example used a `meter` expression without declaring the dynamic set used to hold per-source state. Changed the example to create an explicit `ssh_meter` set with `flags dynamic` and `timeout 60s`, then use `update @ssh_meter { ip saddr limit rate 3/minute }`, matching the nftables documented dynamic set pattern.
- The performance section claimed all nftables set lookups are O(1) and that a 10,000-element set performs exactly like a 10-element set. This was too absolute because nftables can use different backends, including hash tables and red-black trees. Reworded the claim to say sets use efficient internal data structures and avoid long linear rule chains.

## Review Notes
The remaining examples align with documented RHEL 9 nftables command syntax, including escaped semicolons for shell commands, interval sets for CIDR ranges, timeout elements, concatenated sets, verdict maps, named maps, and ruleset-file syntax.
