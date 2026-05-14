# Validation Summary: How to Set Up vsftpd with Virtual Users on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- vsftpd
- FTP virtual users
- Linux PAM
- Berkeley DB db_load
- firewalld
- SELinux
- curl

## Sources Consulted
- vsftpd.conf manual: https://security.appspot.com/vsftpd/vsftpd_conf.html
- Linux-PAM pam_userdb(8) manual: https://man7.org/linux/man-pages/man8/pam_userdb.8.html
- Oracle Berkeley DB db_load documentation: https://docs.oracle.com/cd/E17275_01/html/api_reference/C/db_load.html
- Red Hat Enterprise Linux 9 documentation for installing and configuring vsftpd for FTP service: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/automatically_installing_rhel/Red_Hat_Enterprise_Linux-9-Automatically_installing_RHEL-en-US.pdf
- Red Hat SELinux documentation for FTP booleans and public_content_rw_t: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-file_transfer_protocol-booleans
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd
- everything curl FTP upload documentation: https://ec.haxx.se/ftp/upload.html

## Issues Found
- The post used `xferlog_file=/var/log/vsftpd.log` while leaving `xferlog_std_format` at its default. In vsftpd, `xferlog_file` controls the wu-ftpd-style transfer log, while the default vsftpd-format log path is controlled by `vsftpd_log_file`. Changed the setting to `vsftpd_log_file=/var/log/vsftpd.log`.
- The `uploaduser` per-user configuration was labeled "upload only" but still allowed downloads and destructive write commands. Added `download_enable=NO` and denied `DELE`, `RNFR`, `RNTO`, and `RMD` for that user.
- The SELinux example enabled `ftpd_full_access`, which is broader than needed for a directory labeled `public_content_rw_t`. Changed it to `ftpd_anon_write`, which Red Hat documents as the boolean for allowing FTP uploads to `public_content_rw_t` content when Linux permissions also allow the write.

## Review Notes
Berkeley DB `libdb` is deprecated in RHEL 9 and may not be available in future major RHEL releases, but it is still provided in RHEL 8 and RHEL 9, so the tutorial remains valid for current RHEL releases. The `chcon` command is technically valid, but a future improvement could use `semanage fcontext` plus `restorecon` for a relabel-persistent SELinux file context.
