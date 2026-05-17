# Validation Summary: How to Write nftables Rules from Scratch on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- nftables (nft framework and CLI)
- iptables (compatibility / migration context)
- netfilter hooks, chain types, families
- systemd (`nftables.service`)
- Ubuntu 20.04 / 22.04 (firewall stack)
- NAT (SNAT/masquerade, DNAT/port forwarding)
- Sets, maps, meters (rate limiting per source IP)

## Sources Consulted
- nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Main_Page
- nft(8) manual page: https://www.netfilter.org/projects/nftables/manpage.html
- nftables wiki — Configuring chains: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- nftables wiki — Sets: https://wiki.nftables.org/wiki-nftables/index.php/Sets
- nftables wiki — Performing Network Address Translation (NAT): https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_(NAT)
- nftables wiki — Moving from iptables to nftables: https://wiki.nftables.org/wiki-nftables/index.php/Moving_from_iptables_to_nftables
- Ubuntu package index for `iptables` (provides `iptables-translate` / `iptables-restore-translate`): https://packages.ubuntu.com/jammy/iptables
- Debian wiki — nftables: https://wiki.debian.org/nftables

## Issues Found
1. **Non-existent package `iptables-nftables-compat`** in the "Migrating from iptables" section. This package does not exist in Ubuntu repositories. The `iptables-translate` and `iptables-restore-translate` commands are provided by the standard `iptables` package on Ubuntu 20.04+ (which uses the nftables backend by default via `iptables-nft`). Changed the install command to `sudo apt install -y iptables` and updated the surrounding comment.
2. **Rate limiting comment/rule mismatch.** The first rate-limit example claimed "drop if more than 3 new connections per 30 seconds per IP" while the actual rule used `limit rate over 3/minute`. The same mismatch appeared in the config-file meter example. Updated both comments to accurately describe `3/minute` (3 new connections per minute per source IP for the meter case).

## Review Notes
- The mix of `ip protocol icmp` and `ip6 nexthdr icmpv6` matchers in the `inet` family is correct and idiomatic; a more concise alternative is `meta l4proto { icmp, icmpv6 } accept` but the post's explicit form is clearer for beginners.
- NAT chain priorities `-100` (prerouting/dstnat) and `100` (postrouting/srcnat) match the netfilter defaults; named aliases (`priority dstnat;`, `priority srcnat;`) are an equivalent modern alternative but the numeric form still works.
- Sets defined with both `flags interval, timeout` and `timeout 24h` are valid; per-element timeouts can override the default.
- The `log ... limit rate 5/minute drop` single-line rule chains statements correctly — the `limit` acts as a match (true when within rate), so log+drop only fire while inside the rate window. With a `policy drop` already set, packets in excess of the rate still get dropped by the policy, just without being logged. This is a common, correct pattern.
- The `iptables-restore-translate` output occasionally needs minor manual fixups (e.g., chain naming, jumps to user chains); the post acknowledges this.
- `nftables.service` ships disabled by default on fresh Ubuntu server images; the `systemctl enable` step in the post is therefore necessary if you want rules to persist across reboots.
