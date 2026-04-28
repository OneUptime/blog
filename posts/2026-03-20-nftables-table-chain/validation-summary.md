# Validation Summary: How to Create Your First nftables Table and Chain

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- nftables (Linux netfilter framework)
- Linux firewalling (replacement for iptables)
- Address families: ip, ip6, inet, arp, bridge
- Netfilter hooks: input, output, forward, prerouting, postrouting
- Chain types: filter, nat, route

## Sources Consulted
- nftables wiki - Configuring tables: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_tables
- nftables wiki - Configuring chains: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- nftables wiki - Netfilter hooks: https://wiki.nftables.org/wiki-nftables/index.php/Netfilter_hooks
- Linux kernel header `include/uapi/linux/netfilter_ipv4.h` (NF_IP_PRI_* constants)
- nft(8) man page

## Issues Found
- **Incorrect priority value for `mangle`**: The "Understanding Chain Parameters" section listed standard priorities as "-200 (conntrack), 0 (filter), 100 (mangle)". The value `100` is actually the `NF_IP_PRI_NAT_SRC` priority (srcnat / postrouting NAT), not mangle. The correct mangle priority is `-150` (`NF_IP_PRI_MANGLE`). Fixed by updating the line to: "Standard priorities: -200 (conntrack), -150 (mangle), 0 (filter), 100 (srcnat)". This also keeps the list consistent with the NAT example used later in the post (where `priority 100` correctly appears on the postrouting NAT chain, i.e. srcnat).

## Review Notes
- All `nft add table` commands and address family names (`ip`, `ip6`, `inet`, `arp`, `bridge`) are correct. The `netdev` family also exists but is not required for an introductory post.
- Base chain creation syntax `'{ type filter hook input priority 0; policy drop; }'` is correct, including the use of single quotes to protect the braces and semicolons from the shell.
- Chain types `filter`, `nat`, and `route` are accurate. `route` is valid only for `ip`/`ip6`/`inet` families on the `output` hook; the post's brief description is acceptable for an intro guide.
- Hooks listed (input, output, forward, prerouting, postrouting) are correct. The `ingress` hook (netdev family) and the newer `egress` hook are not mentioned, but that is fine for an introductory tutorial.
- The NAT chain priorities used in the example (`-100` for prerouting/dstnat and `100` for postrouting/srcnat) are correct.
- Regular (non-base) chain creation `nft add chain inet firewall allowed-ports` is correct - omitting the hook/priority/type spec creates a regular chain that must be reached via `jump` or `goto`.
- The `nft list tables`, `nft list table inet firewall`, and `nft list ruleset` commands are all correct.
- Statement that nftables requires explicit table and chain creation (unlike iptables' predefined tables) is accurate.
