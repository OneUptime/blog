# Validation Summary: How to Install and Configure vsftpd on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- vsftpd
- FTP
- firewalld
- SELinux
- systemd
- curl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Sharing the installation files on an FTP server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index#sharing-the-installation-files-on-an-ftp-server_preparing-network-based-repositories
- Red Hat Enterprise Linux 9 documentation, "Securing network services": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/securing_networks/Red_Hat_Enterprise_Linux-9-Securing_networks-en-US.pdf
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, "File Transfer Protocol": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/chap-managing_confined_services-file_transfer_protocol
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, "Booleans": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-file_transfer_protocol-booleans
- Red Hat Enterprise Linux 6 Deployment Guide, "The vsftpd Server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/s2-ftp-servers-vsftpd
- Local Linux man pages for systemctl(1), shells(5), useradd(8), and curl(1)

## Issues Found
- The post described vsftpd as the default FTP server on RHEL. Red Hat documents vsftpd as the FTP daemon/package provided by RHEL and, in older documentation, the only stand-alone FTP server distributed with RHEL, but it is not necessarily installed or enabled by default. Changed the wording to "the FTP daemon provided by RHEL."
- The SELinux section used `ftp_home_dir`, which Red Hat documents as unavailable in newer RHEL 7 releases, and used `ftpd_full_access` while the RHEL 9 documentation references `allow_ftpd_full_access`. Replaced the two commands with `sudo setsebool -P allow_ftpd_full_access 1` for broad authenticated read/write access under normal Linux permissions.

## Review Notes
- The guide intentionally configures plain FTP and correctly notes that production use should enable TLS because FTP credentials and data are otherwise sent without encryption.
- `allow_writeable_chroot=YES` is functional, but a more restrictive production layout would keep the chroot root non-writable and make only subdirectories writable.
