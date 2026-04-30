# Validation Summary: How to Write iptables Rules to Block Specific IPv4 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- iptables
- ipset
- netfilter-persistent / iptables-persistent
- Linux kernel logging with `dmesg` and `journalctl`

## Sources Consulted
- `iptables(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables.8.html
- `iptables-extensions(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `iptables-save(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/iptables-save.8.html
- `netfilter-persistent(8)` Debian man page: https://manpages.debian.org/trixie/netfilter-persistent/netfilter-persistent.8.en.html
- Debian `iptables-persistent` IPv4 plugin source: https://sources.debian.org/src/iptables-persistent/1.0.11%2Bdeb10u1/plugins/15-ip4tables/
- Debian `iptables-persistent` README: https://sources.debian.org/src/iptables-persistent/1.0.15/debian/README
- Red Hat Enterprise Linux 6 Security Guide, saving `iptables` rules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/security_guide/sect-security_guide-iptables-saving_iptables_rules
- Red Hat Enterprise Linux 7 Security Guide, `iptables-services` and `ipset`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/security_guide/sec-setting_and_controlling_ip_sets_using_iptables
- `ipset` project documentation: https://ipset.netfilter.org/features.html
- Red Hat Enterprise Linux 9 firewall documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_firewalls_and_packet_filters/getting-started-with-nftables_firewall-packet-filters

## Issues Found
- The `REJECT` example comment said "host-unreachable" while the command actually used `--reject-with icmp-host-prohibited`. I updated the comment to match the command.
- The RHEL/CentOS persistence example omitted that the `iptables` service is provided by the `iptables-services` package on those systems. I updated the comment to make that requirement explicit.
- The manual save example used `sudo iptables-save > /etc/iptables/rules.v4`, which is unreliable because shell redirection happens before `sudo`. I replaced it with `sudo iptables-save -f /etc/iptables/rules.v4`, which is supported by `iptables-save(8)` and writes directly to the target file.
- The final `ipset` sentence claimed guaranteed `O(1)` lookups versus `O(n)` individual rules. The official documentation describes indexed, very fast matching and performance advantages, but not that absolute complexity guarantee. I reworded the sentence to keep the performance guidance accurate.

## Review Notes
- The post is technically correct after the fixes above. On some modern distributions, `iptables` is a compatibility frontend or is deprecated in favor of `nftables`, so persistence workflows can vary by distro.
