# Validation Summary: nftables Guide: Configure Linux Firewall Rules (With Examples)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- nftables
- Linux packet filtering
- nft CLI
- Netfilter NAT, DNAT, and masquerade
- nftables dynamic sets and rate limiting
- iptables to nftables migration tools
- systemd nftables service integration

## Sources Consulted
- Netfilter nftables man page: https://www.netfilter.org/projects/nftables/manpage.html
- nftables quick reference: https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes
- nftables NAT documentation: https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_%28NAT%29
- nftables iptables migration documentation: https://wiki.nftables.org/wiki-nftables/index.php/Moving_from_iptables_to_nftables
- nftables ruleset tracing documentation: https://wiki.nftables.org/wiki-nftables/index.php/Ruleset_debug/tracing
- Local `nft --help` and `man nft` output from nftables v1.0.9
- Local `iptables-restore-translate --help` output from iptables 1.8.10
- Local systemd `nftables.service` unit showing `/etc/nftables.conf` load and reload behavior

## Issues Found
- The command `sudo nft list ruleset > /etc/nftables.conf` would run the redirection in the unprivileged shell, so it can fail when writing to `/etc/nftables.conf`. Changed it to `sudo sh -c 'nft list ruleset > /etc/nftables.conf'`.
- Packet-path dynamic set examples did not specify maximum set sizes. The nftables man page recommends bounding sets updated from packet path to avoid unbounded memory growth. Added `size 65535` to the SSH rate-limit, flood-watch, banned, port-knock, and temporary SSH allow sets.
- Dynamic timeout-set rate-limit examples used `add` where `update` is more appropriate for refreshing existing elements. Changed those packet-path updates to `update`.
- The dynamic rule insertion example used `position 0`, but current nft syntax documents `index index` and `handle handle` as location specifiers. Changed the example to `index 0` and clarified that it inserts before the current first rule.
- The real-time logging command grepped for `nftables`, but the logging example emits prefixes such as `SSH-NEW`, `WEB-NEW`, and `DROP-*`. Updated the grep pattern to match the configured prefixes.
- The backup command `sudo nft list ruleset > /root/...` had the same privileged redirection problem as the `/etc/nftables.conf` example. Changed it to run the redirection inside `sudo sh -c`.
- The "Create atomic backup" example flushed the active ruleset and then reloaded the backup, which is not a backup operation and could leave the host with an empty ruleset if reload failed. Replaced it with a backup-plus-parse-check example using `sudo nft -c -f /tmp/rules.bak`.

## Review Notes
- The examples are broadly accurate for current nftables syntax and behavior. Some examples use numeric chain priorities such as `0`, `-100`, and `100`; named priorities like `filter`, `dstnat`, and `srcnat` can be clearer, but the numeric values shown are valid.
- Interface names such as `eth0` and `eth1` are examples and may need adjustment on systems using predictable interface names.
