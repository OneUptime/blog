# Validation Summary: How to Migrate from ip6tables to nftables

## Status
validated

## Post Type
Guide

## Technologies Covered
- ip6tables
- nftables
- Linux Netfilter
- IPv6 firewall rules
- systemd
- Debian/Ubuntu package management

## Sources Consulted
- Netfilter nftables wiki, "Moving from iptables to nftables": https://wiki.netfilter.org/wiki-nftables/index.php/Moving_from_iptables_to_nftables
- Netfilter nftables wiki, "Nftables families": https://wiki.nftables.org/wiki-nftables/index.php/Nftables_families
- Netfilter nftables wiki, "List of available translations via iptables-translate tool": https://wiki.netfilter.org/wiki-nftables/index.php/List_of_available_translations_via_iptables-translate_tool
- Netfilter nftables wiki, "Meters": https://wiki.netfilter.org/wiki-nftables/index.php/Meters
- Netfilter nftables wiki, "Troubleshooting": https://wiki.nftables.org/wiki-nftables/index.php/Troubleshooting
- Netfilter nftables man page: https://netfilter.org/projects/nftables/manpage.html
- Local CLI verification on this host: `ip6tables-translate --help`, `ip6tables-restore-translate --help`, `nft --help`, `nft describe icmpv6 type`, and live `ip6tables-translate` output from iptables `v1.8.10`

## Issues Found
- The post used `iptables-restore-translate -6` for bulk IPv6 conversion. I changed this to `ip6tables-restore-translate -f`, which matches current tool usage for IPv6 rulesets.
- The prerequisite install command only installed `iptables`. I changed it to install both `nftables` and `iptables`, because the `nft` CLI and the translation helpers come from different packages on Debian-family systems.
- The example `ip6tables-translate` outputs did not match current translator output. I updated them to reflect the actual emitted `nft ...` commands, including the IPv6 ICMP protocol qualifier.
- The `-m recent` section implied a direct translation path and used `ct count over 4` as a manual equivalent. I replaced that with a documented manual-rewrite pattern based on dynamic sets/rate limiting, because `ct count` models concurrent connections rather than recent-hit tracking.
- The `ip6` to `inet` example broadened an IPv6-only rule into a dual-stack rule. I corrected the example to show how to keep a rule IPv6-only inside an `inet` table and clarified that omitting the family qualifier intentionally makes the rule match both IPv4 and IPv6.
- The safety-timer cleanup used `atq | tail -1`, which can remove the wrong queued job. I changed it to capture and later remove the specific `at` job created by the guide.
- The systemd disable commands assumed distro-specific units always exist. I made them tolerant of systems where those units are absent.

## Review Notes
- Mixing active legacy iptables/ip6tables rules with native nftables rules can produce unexpected results. The post now explicitly warns that the active legacy ruleset should be removed before testing the translated nftables rules.
- The final "After (nftables)" example is valid native nftables syntax, but it is illustrative rather than byte-for-byte `ip6tables-translate` output.
