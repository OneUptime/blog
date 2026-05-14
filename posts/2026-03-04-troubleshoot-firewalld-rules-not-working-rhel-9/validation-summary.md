# Validation Summary: How to Troubleshoot Firewalld Rules Not Working on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- firewalld
- firewall-cmd
- nftables
- iptables compatibility tooling
- SELinux
- systemd

## Sources Consulted
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld rich language manual page: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- firewalld zones documentation: https://firewalld.org/documentation/zone/
- firewalld connections, interfaces, and sources documentation: https://firewalld.org/documentation/zone/connections-interfaces-and-sources
- Red Hat Enterprise Linux 9 Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Enterprise Linux 9 Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- nftables quick reference: https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes
- ausearch manual page: https://man7.org/linux/man-pages/man8/ausearch.8.html

## Issues Found
- The statement "no rules are enforced" when firewalld is stopped was too broad because other nftables or iptables rules can still exist outside firewalld. Changed it to "firewalld-managed rules are not enforced."
- The SELinux example used `semanage port -a -t http_port_t -p tcp 8080`. On RHEL 9, TCP port 8080 is commonly already assigned to `http_cache_port_t`, so adding it to `http_port_t` as a new port can fail. Changed the example to inspect `http_port_t` and add an unassigned example port, `9876/tcp`.
- The diagnostic conclusion after stopping firewalld said the issue is "definitely" firewall rules. Changed it to "very likely" because stopping firewalld only isolates firewalld-managed behavior and does not prove every possible networking condition.

## Review Notes
The remaining firewalld commands, runtime versus permanent explanation, zone assignment guidance, source-zone precedence, rich-rule priority behavior, nftables inspection commands, and SELinux AVC search command are consistent with the consulted documentation.
