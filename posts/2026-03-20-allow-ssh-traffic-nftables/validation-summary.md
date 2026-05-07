# Validation Summary: How to Allow SSH Traffic with nftables

## Status
validated

## Post Type
Guide

## Technologies Covered
- nftables
- Linux firewalling
- SSH
- systemd
- IPv4/IPv6 networking

## Sources Consulted
- `nft(8)` man page from the Netfilter project: https://netfilter.org/projects/nftables/manpage.html
- nftables wiki, Configuring chains: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- nftables wiki, Nftables families: https://wiki.nftables.org/wiki-nftables/index.php/Nftables_families
- nftables wiki, Operations at ruleset level: https://wiki.nftables.org/wiki-nftables/index.php/Operations_at_ruleset_level
- nftables wiki, Simple ruleset for a server: https://wiki.nftables.org/wiki-nftables/index.php/Simple_ruleset_for_a_server
- Local `nft --help` output and local `man nft`

## Issues Found
- The interactive setup created the `input` base chain with `policy drop` before any allow rules existed. That can immediately drop inbound traffic, including the active SSH session the post is trying to preserve. I changed the live setup to keep `policy accept` while building rules and clarified that the drop policy should only be applied after the ruleset is complete.
- The verification command used `nft list table inet filter -a`, but `-a` is an `nft` option and should appear before the command. I changed it to `nft -a list table inet filter`.
- The restricted-source examples used `ip saddr` inside an `inet` table but described them as generic source IP rules. In an `inet` table, `ip saddr` matches IPv4 only. I clarified that those examples are IPv4-specific and noted that `ip6 saddr` is needed for IPv6 source restrictions.
- The persistence example exported the live ruleset directly to `/etc/nftables.conf` without a leading `flush ruleset`. Official nftables backup/restore guidance recommends prepending `flush ruleset` so the file can be reloaded safely. I changed the commands accordingly.
- The full `inet` ruleset omitted ICMPv6 neighbor discovery allowances. On IPv6 systems that can break connectivity even if TCP/22 is allowed. I added the minimal ICMPv6 neighbor discovery rule used in official nftables server examples.

## Review Notes
- The persistence example still assumes a systemd-based distribution that loads `/etc/nftables.conf`, which is common but distribution-specific.
- The example `forward` chain uses `policy drop`, which is appropriate for a standalone server but would need adjustment on a host that intentionally forwards traffic.
