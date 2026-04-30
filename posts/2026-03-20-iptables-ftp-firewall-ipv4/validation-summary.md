# Validation Summary: How to Configure iptables Firewall Rules for FTP on IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- iptables
- Netfilter connection tracking
- `nf_conntrack_ftp`
- FTP active mode
- FTP passive mode
- IPv4 firewall configuration

## Sources Consulted
- Linux kernel documentation: Netfilter conntrack sysctl variables, especially `nf_conntrack_helper` default behavior and helper assignment requirements: https://docs.kernel.org/networking/nf_conntrack-sysctl.html
- `iptables-extensions(8)` manual page for `CT --helper`, `conntrack`, and `RELATED` state semantics: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- RFC 959, File Transfer Protocol, for active/passive data connection behavior and default FTP data ports: https://datatracker.ietf.org/doc/html/rfc0959
- RFC 1579, Firewall-Friendly FTP, for passive-mode behavior through packet-filter firewalls: https://datatracker.ietf.org/doc/rfc1579/
- systemd `modules-load.d(5)` documentation for persistent module loading configuration: https://www.freedesktop.org/software/systemd/man/latest/modules-load.d.html
- Debian `netfilter-persistent(8)` man page for rule persistence commands on Debian/Ubuntu-family systems: https://manpages.debian.org/trixie/netfilter-persistent/netfilter-persistent.8.en.html
- Red Hat documentation on iptables service storage in `/etc/sysconfig/iptables` and the `firewalld` default on RHEL systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/security_guide/sec-setting_and_controlling_ip_sets_using_iptables
- GNU Inetutils FTP client manual for active/passive client behavior references while checking the testing examples: https://www.gnu.org/software/inetutils/manual/inetutils.html

## Issues Found
- The post originally said that loading `nf_conntrack_ftp` was sufficient for automatic FTP tracking. On modern kernels, automatic helper assignment is disabled by default, so I added the required `iptables -t raw ... -j CT --helper ftp` rule and updated the explanation to reflect that.
- The original ruleset implied that an explicit passive port rule belonged in the helper-based ruleset. I changed that example so the passive port range is shown as optional only when the helper is not being used.
- The module persistence example used `/etc/modules`, which is not a good generic path for modern Linux systems. I replaced it with a `modules-load.d` example.
- The passive-port restriction example said "same trusted IPs" but only included one of the two trusted sources. I added the missing `203.0.113.20` rule.
- The save/verify examples mixed Debian/Ubuntu and RHEL/CentOS file paths. I made the RHEL/CentOS example explicitly conditional on `iptables-services` and added the correct verification path for each family.
- The passive-mode testing command depended on a client-specific startup flag. I replaced it with a client-neutral passive-mode instruction so the example no longer assumes a particular FTP implementation.

## Review Notes
The reviewed commands assume the FTP server listens on the standard control port `21`; if the daemon uses a different control port, the `CT --helper ftp` rule must match that port instead. The RHEL/CentOS persistence example applies to systems using the legacy `iptables-services` stack rather than the default `firewalld` workflow.
