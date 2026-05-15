# Validation Summary: How to Set Up FTP Chroot Jails with vsftpd on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- vsftpd
- FTP
- chroot jails
- SELinux
- firewalld
- DNF

## Sources Consulted
- Red Hat Enterprise Linux 6 Deployment Guide, vsftpd server options: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/s2-ftp-servers-vsftpd
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, FTP types and booleans: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/chap-managing_confined_services-file_transfer_protocol
- Red Hat Enterprise Linux 9 DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- vsftpd.conf manual page: https://manpages.debian.org/testing/vsftpd/vsftpd.conf.5.en.html
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld open port/service documentation: https://firewalld.org/documentation/howto/open-a-port-or-service.html
- curl manual page: https://curl.se/docs/manpage.html

## Issues Found
- The logging example used `xferlog_file=/var/log/vsftpd.log` while relying on vsftpd's default log format. I changed it to `vsftpd_log_file=/var/log/vsftpd.log`, because `xferlog_file` applies to the standard xferlog-style log path while `vsftpd_log_file` controls the vsftpd-format log.
- The SELinux section used `setsebool -P ftp_home_dir 1` for custom directories. I replaced it with `setsebool -P ftpd_anon_write 1` after labeling `/srv/ftp` with `public_content_rw_t`, because Red Hat documents `ftpd_anon_write` as the boolean that permits FTP daemons to write to `public_content_rw_t` content, and `ftp_home_dir` is not available on modern RHEL 7 policy releases.
- The testing note said both `cd /` and `cd /etc` should keep the session within the chroot. I clarified that `cd /` should show the jail root and `cd /etc` should fail unless an `/etc` directory exists inside the jail.

## Review Notes
The post remains technically valid after the fixes. FTP still sends credentials in clear text unless TLS is configured; the post mentions TLS only at the end and could expand on FTPS in a future article.
