# Validation Summary: How to Configure SELinux Booleans to Customize Policy on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux
- SELinux booleans
- `getsebool`, `setsebool`, `semanage boolean`, `ausearch`, and `sealert`
- Apache HTTP Server, Samba, NFS, FTP, and Postfix SELinux policy examples

## Sources Consulted
- Red Hat Enterprise Linux 9 Using SELinux, Chapter 4: Configuring SELinux for applications and services with non-standard configurations: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/configuring-selinux-for-applications-and-services-with-non-standard-configurations_using-selinux
- Red Hat Enterprise Linux 9 Using SELinux, Chapter 5: Troubleshooting problems related to SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/troubleshooting-problems-related-to-selinux_using-selinux
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, Booleans: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-working_with_selinux-booleans
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, Apache HTTP Server booleans: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-the_apache_http_server-booleans
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, Samba booleans: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-samba-booleans
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, File Transfer Protocol booleans: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-file_transfer_protocol-booleans
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, Postfix booleans: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-postfix-booleans
- `semanage-boolean(8)` manual page: https://man7.org/linux/man-pages/man8/semanage-boolean.8.html

## Issues Found
- The `httpd_can_network_relay` example described CGI scripts making network connections. Changed the comment to describe Apache acting as a network relay or proxy.
- The Samba examples said `samba_export_all_ro` and `samba_export_all_rw` allow Samba to export NFS volumes. Changed the comments to describe exporting unlabeled content read-only and read-write.
- The `samba_domain_controller` example was described as allowing Samba to use CUPS for printing. Changed the comment to domain controller behavior.
- The FTP section used obsolete or incorrect boolean names for RHEL 9: `ftp_home_dir` and `allow_ftpd_anon_write`. Changed these to current FTP-related booleans shown in Red Hat's RHEL 9 documentation: `ftpd_use_nfs` and `ftpd_anon_write`.
- The Postfix example claimed `postfix_local_write_mail_spool` allows external database connections. Changed the comment to local mail spool write access.
- The `nis_enabled` example claimed mail network access. Changed the comment to the broader NIS behavior.
- The `ausearch` example searched only `avc`. Updated it to Red Hat's recommended SELinux denial message set: `AVC,USER_AVC,SELINUX_ERR,USER_SELINUX_ERR`.

## Review Notes
SELinux boolean availability and descriptions can vary by policy package version. The post correctly advises using `getsebool`, `semanage boolean -l`, and audit output to verify which boolean applies on the target RHEL system.
