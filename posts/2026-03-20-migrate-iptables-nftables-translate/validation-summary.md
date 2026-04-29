# Validation Summary: How to Migrate iptables Rules to nftables Using iptables-translate

## Status
validated

## Post Type
Guide

## Technologies Covered
- iptables
- iptables-translate
- iptables-restore-translate
- nftables
- Linux firewall management

## Sources Consulted
- Netfilter iptables translation man page: https://git.netfilter.org/iptables/tree/iptables/xtables-translate.8?id=ce3c7808c2110d8b587cc5c54951232e50fe0636
- Netfilter nftables man page: https://www.netfilter.org/projects/nftables/manpage.html
- nftables wiki, Moving from iptables to nftables: https://wiki.nftables.org/wiki-nftables/index.php/Moving_from_iptables_to_nftables
- nftables wiki, Configuring chains: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- nftables wiki, Operations at ruleset level: https://wiki.nftables.org/wiki-nftables/index.php/Operations_at_ruleset_level
- Local CLI/manpage verification against installed `iptables-translate`, `iptables-restore-translate`, `nft`, `man iptables-translate`, and `man iptables-extensions`

## Issues Found
- The single-rule translation examples did not match current `iptables-translate` output formatting. I updated the example outputs to the current shell-ready `nft 'add rule ...'` form and corrected the conntrack state ordering emitted by the translator.
- The saved-ruleset translation example omitted `policy accept;` in the translated base-chain definitions. I added the policy fields to match current `iptables-restore-translate` behavior when translating default ACCEPT policies from `iptables-save`.
- The rate-limit example omitted the default `burst 5 packets` portion emitted by the current translator. I corrected the translated nftables command.
- The `nft -c` explanation described the flag as a dry run. I changed it to the more precise `check without applying changes`, which matches the nftables documentation.
- The migration script assumed a generic `iptables` systemd service existed and could be stopped/disabled. I removed those distro-specific commands and kept persistence as an explicitly distro-specific example for systems using `nftables.service`.

## Review Notes
- `iptables-translate` and `iptables-restore-translate` are text-conversion tools; the upstream documentation notes that some extensions may be unsupported or only partially supported.
- The post’s closing note about refactoring translated output to use nftables-native constructs such as sets and verdict maps is technically sound and aligned with the nftables migration guidance.
- Live `nft -c -f` execution could not be fully validated in this environment because the local `nft` binary returned `Operation not permitted` during netlink cache initialization, but the command syntax and flag usage were verified against the official nftables documentation.
