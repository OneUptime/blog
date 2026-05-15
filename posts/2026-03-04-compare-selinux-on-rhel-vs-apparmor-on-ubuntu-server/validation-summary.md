# Validation Summary: How to Compare SELinux on RHEL vs AppArmor on Ubuntu Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Ubuntu Server
- SELinux
- AppArmor
- systemd
- firewalld
- Linux audit tools

## Sources Consulted
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Ubuntu Server AppArmor documentation: https://ubuntu.com/server/docs/how-to/security/apparmor/
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- systemctl local help output
- journalctl local help output
- RPM manual: https://rpm.org/docs/4.19.x/man/rpm.8.html

## Issues Found
- The prerequisites listed only RHEL/CentOS Stream even though the post compares SELinux with AppArmor on Ubuntu Server. Added Ubuntu Server as a prerequisite for the AppArmor side of the comparison.
- The table described AppArmor's default mode only as "Enabled". Ubuntu documents AppArmor as installed and loaded by default, while individual profiles can be in enforce or complain mode. Updated the table cell to reflect that distinction.
- The "Enable and Start the Service" section used a generic `<service-name>` flow that does not apply to SELinux, which is a kernel security module rather than a regular service. Replaced it with `getenforce`, `sestatus`, `aa-status`, and `systemctl status apparmor`.
- The firewall section implied that comparing SELinux and AppArmor requires opening a port. It does not. Updated the text and comments to clarify that firewall changes are only relevant when testing a separate network service, while keeping the firewalld command syntax valid.
- The verification section used generic service checks. Replaced them with SELinux and AppArmor status commands.
- The troubleshooting section used generic service and package placeholders. Updated it to refer to AppArmor service logs, SELinux AVC denials, conditional firewall checks, and relevant package examples.

## Review Notes
The post remains high-level and does not demonstrate creating or modifying SELinux policies or AppArmor profiles. The corrected commands are suitable for checking and comparing status, but a future revision could add concrete profile examples if the post is intended to be a hands-on tutorial.
