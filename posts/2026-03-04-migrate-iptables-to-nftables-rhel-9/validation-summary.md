# Validation Summary: How to Migrate from iptables to nftables on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- iptables and ip6tables
- nftables
- firewalld
- systemd services

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring firewalls and packet filters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/index
- Red Hat Enterprise Linux 9.0 Release Notes, "Deprecated functionality": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.0_release_notes/deprecated_functionality
- Local command help for `iptables-restore-translate`, `ip6tables-restore-translate`, and `nft`.
- Local command output from `iptables-translate` for the sample rule translations.

## Issues Found
- The post instructed readers to install `iptables-nft`. Red Hat's RHEL 9 documentation says the migration tools are provided with the `iptables` package, and RHEL 9 deprecates the `iptables-nft` package and nft variants. I changed the install command to `dnf install iptables nftables -y` and listed the IPv4 and IPv6 translation commands.
- The post combined translated IPv4 and IPv6 rules into one file under `/root` and later saved the live ruleset into `/etc/nftables/main.nft`. Red Hat's documented migration flow writes the translated IPv4 and IPv6 rulesets into separate files under `/etc/nftables/` and includes both from `/etc/sysconfig/nftables.conf`. I updated the commands to follow that documented persistence model.
- The post started the `nftables` service before configuring it to load the translated rules. I moved the start step until after the include statements are added, so the service loads the migrated rules when it starts.

## Review Notes
- The example `iptables-translate` commands are syntactically valid and produce equivalent nftables command output, though the exact display includes shell quoting in current local output.
- The quick-reference nftables delete example depends on using a real nftables rule handle; in practice, readers should list rules with handles when choosing the value to delete.
