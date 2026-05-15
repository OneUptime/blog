# Validation Summary: How to Use iptables-restore-translate for nftables Migration on RHEL

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- nftables
- iptables and ip6tables
- iptables-restore-translate and ip6tables-restore-translate
- systemd nftables service

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring firewalls and packet filters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/index
- nftables wiki, "Moving from iptables to nftables": https://wiki.nftables.org/wiki-nftables/index.php/Moving_from_iptables_to_nftables
- Local `iptables-restore-translate` / `ip6tables-restore-translate` help and man page from iptables 1.8.10
- Local `nft --help` and `nft(8)` man page

## Issues Found
- The prerequisites said to install `iptables-nft`. RHEL 9 documentation for this migration lists the `nftables` and `iptables` packages as prerequisites, and the same RHEL 9 documentation notes that `iptables-nft` is deprecated. Updated the command to `dnf install nftables iptables -y`.
- The post said untranslated rules are printed as stderr warnings. The official examples and local `iptables-restore-translate` behavior show unsupported translations as commented rules in stdout, while syntax or processing errors may appear on stderr. Updated the section to check for commented `-A` rules in the generated file while still capturing stderr.
- The command under "Count rules per table" used `grep -c "^-A"`, which counts total appended rules in the dump rather than grouping by table. Updated the label to "Count total rules" to match the command.

## Review Notes
- The main translation commands, `iptables-save`, `ip6tables-save`, `iptables-restore-translate -f`, `ip6tables-restore-translate -f`, `nft -f`, `nft -c -f`, `nft list ruleset`, and `/etc/sysconfig/nftables.conf` include workflow match RHEL 9 documentation and local command help.
- Local `nft -c -f` syntax validation of the sample ruleset could not complete in this container because netfilter operations require privileges not available to the process, but the command and syntax are documented by `nft(8)` and Red Hat examples.
- RHEL 9 also recommends disabling the `iptables` service or any custom iptables-loading scripts when migrating. The post's persistence section is technically valid, but adding that operational caveat would make a future revision more complete.
