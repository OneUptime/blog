# Validation Summary: How to Configure nftables Connection Tracking on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- nftables
- Linux netfilter connection tracking
- conntrack-tools
- Linux sysctl configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring firewalls and packet filters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index
- nftables wiki, "Connection Tracking System": https://wiki.nftables.org/wiki-nftables/index.php/Connection_Tracking_System
- nftables wiki, "Matching connection tracking stateful metainformation": https://wiki.nftables.org/wiki-nftables/index.php/Matching_connection_tracking_stateful_metainformation
- nftables wiki, "Setting packet connection tracking metainformation": https://wiki.nftables.org/wiki-nftables/index.php/Setting_packet_connection_tracking_metainformation
- nftables wiki, "Conntrack helpers": https://wiki.nftables.org/wiki-nftables/index.php/Conntrack_helpers
- conntrack-tools user manual: https://conntrack-tools.netfilter.org/manual.html
- Linux kernel documentation, "Netfilter Conntrack Sysfs variables": https://www.kernel.org/doc/html/v5.15/networking/nf_conntrack-sysctl.html
- Local nftables man page and `nft --check` syntax checks using nftables v1.0.9.

## Issues Found
- The prerequisites used the `conntrack` command but did not mention the required `conntrack-tools` package. Added it to the prerequisites.
- Step 4 changed `nf_conntrack_buckets` at runtime but did not persist that setting in the sysctl configuration. Added `net.netfilter.nf_conntrack_buckets = 65536` to the persistent sysctl file.
- Step 5 used `sudo nft add table inet filter` even though Step 2 already creates `table inet filter`, which can fail when the table exists. Replaced it with a `nft list table ... || nft add table ...` command.
- Step 8 saved the ruleset to `/etc/nftables.conf`, but on RHEL 9 the `nftables` systemd service loads scripts included from `/etc/sysconfig/nftables.conf`. Changed the example to write `/etc/nftables/conntrack-firewall.nft` and include it from `/etc/sysconfig/nftables.conf`.

## Review Notes
The nftables `ct state`, `notrack`, and `ct helper` examples match documented nftables syntax and behavior. The timeout defaults shown for TCP established, UDP, and UDP stream tracking match Linux kernel conntrack sysctl documentation. The sample `inet` firewall allows IPv4 ICMP echo requests but does not include explicit ICMPv6 allowances; production IPv6 deployments should add appropriate ICMPv6 rules.
