# Validation Summary: How to Migrate from SUSE Linux Enterprise to RHEL

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- SUSE Linux Enterprise Server
- Red Hat Enterprise Linux
- Convert2RHEL
- RPM, zypper, and DNF package management
- systemd services
- NetworkManager and nmcli
- firewalld and iptables
- Apache HTTP Server
- PostgreSQL
- SELinux
- rsync, scp, and SSH

## Sources Consulted
- Red Hat documentation: Convert2RHEL supported conversion paths, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/con_supported-conversion-paths_converting-from-a-linux-distribution-to-rhel
- Red Hat documentation: Convert2RHEL command-line conversion scope and planning notes, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/index
- Red Hat documentation: RHEL 9 system registration with subscription-manager, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/registering-rhel-by-using-subscription-manager_rhel-installer
- Red Hat documentation: RHEL 9 NetworkManager nmcli static IPv4 configuration, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/
- Red Hat documentation: RHEL 9 firewalld configuration, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat documentation: RHEL SELinux restorecon use with Apache content, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/using_selinux/
- Red Hat documentation: RHEL 9 PostgreSQL setup with postgresql-setup --initdb, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_and_using_database_servers/red_hat_enterprise_linux-9-configuring_and_using_database_servers-en-us.pdf
- SUSE documentation: SLES package management with zypper and RPM, https://documentation.suse.com/sles/15-SP4/html/SLES-all/cha-sw-cl.html
- SUSE documentation: SLES Apache virtual host directory and default DocumentRoot, https://documentation.suse.com/sles/15-SP4/html/SLES-all/cha-apache2.html
- SUSE documentation: SLES firewalld replacing SuSEfirewall2 in SLES 15, https://documentation.suse.com/sles/15-SP5/single-html/SLES-security/index.html

## Issues Found
- The introduction incorrectly implied that SLES and RHEL use different package formats. Both use RPM packages, while zypper and DNF are package managers. Updated the wording to say that Red Hat's Convert2RHEL tooling has no supported SLES-to-RHEL conversion path and that the distributions differ in package managers, repositories, package sets, and system configuration tools.
- The package mapping listed `SUSEfirewall2` as a generic SLES difference. SLES 15 uses firewalld as the default firewall, while older upgraded SLES systems may still use SuSEfirewall2. Updated the mapping to say "Older SLES: SuSEfirewall2 -> RHEL: firewalld."
- The sysctl migration command copied directly from the SLES host into `/etc/sysctl.d/`, which commonly fails because `scp` cannot elevate privileges for the local destination. Changed it to copy files into `/tmp/sles-sysctl/` first, then use `sudo cp` locally.
- The nmcli example assumed the NetworkManager connection profile name was `eth0`. RHEL's documented nmcli workflow operates on a connection profile name, which may differ from the interface name. Added `nmcli con show` and changed the example to use `"<connection_name>"`.

## Review Notes
The post is technically valid as a high-level parallel migration guide. In a future expansion, it could mention workload-specific migration planning, repository/channel mapping, service validation, SELinux booleans for non-default web or database layouts, and the need to review Apache module differences instead of only path differences.
