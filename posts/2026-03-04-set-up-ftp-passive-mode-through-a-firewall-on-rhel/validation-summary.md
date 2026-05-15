# Validation Summary: How to Set Up FTP Passive Mode Through a Firewall on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- vsftpd
- FTP passive mode
- firewalld
- Linux kernel FTP connection tracking
- SELinux
- lftp

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Preparing network-based repositories" / FTP server setup: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_over_the_network/preparing-network-based-repositories_rhel-installer
- Red Hat Enterprise Linux 9 documentation, "Using and configuring firewalld": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd
- vsftpd.conf manual: https://security.appspot.com/vsftpd/vsftpd_conf.html
- Red Hat Enterprise Linux 9 documentation, "Using SELinux": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- semanage-port(8) manual: https://www.man7.org/linux/man-pages/man8/semanage-port.8.html
- ftpd_selinux(8) policy reference: https://manpages.opensuse.org/Leap-16.0/selinux-policy-doc/ftpd_selinux.8.en.html

## Issues Found
- The post stated that the kernel needs `nf_conntrack_ftp` to track FTP connections. Because the guide explicitly opens the configured passive data port range, the helper is not strictly required for that configuration. Updated the wording to make this an optional step for environments that rely on FTP connection tracking.
- The SELinux section implied that `ftpd_use_passive_mode` allows only the configured passive range. That boolean allows FTP daemons to bind to unreserved passive ports more broadly. Updated the wording to distinguish the broad boolean from the more restrictive `semanage port` labeling approach.

## Review Notes
- The vsftpd passive mode directives, `/etc/vsftpd/vsftpd.conf` path, firewalld service and port range commands, and `semanage port` syntax were verified against the consulted documentation.
- `allow_writeable_chroot=YES` is a valid vsftpd option on modern vsftpd, but it is a security trade-off. A future security-focused revision could explain using a non-writable chroot root instead.
