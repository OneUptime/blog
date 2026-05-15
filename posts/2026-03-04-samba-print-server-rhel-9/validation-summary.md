# Validation Summary: How to Set Up Samba as a Print Server on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Samba
- CUPS
- SELinux
- firewalld
- Windows printer driver sharing

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Setting up Samba as a print server, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_network_file_services/configuring_and_using_network_file_services#assembly_setting-up-samba-as-a-print-server_assembly_using-samba-as-a-server
- Red Hat Enterprise Linux 9 documentation: Setting up automatic printer driver downloads for Windows clients on Samba print servers, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_network_file_services/configuring_and_using_network_file_services#proc_setting-up-the-print-share_assembly_using-samba-as-a-server
- Red Hat Enterprise Linux 9 documentation: Configuring and using a CUPS printing server, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_a_cups_printing_server/index
- Red Hat Enterprise Linux 9 documentation: Using SELinux, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Samba smb.conf manual page, https://www.samba.org/samba/docs/4.17/man-html/smb.conf.5.html

## Issues Found
- The package list used `semanage` later in the post but did not install the package that provides it on minimal RHEL systems. Added `policycoreutils-python-utils`.
- The `[printers]` share omitted `create mask = 0600`, which Red Hat recommends for Samba print-server support. Added the setting.
- The `[print$]` share used a non-standard `samba_admins` group and was incomplete for driver uploads. Updated it to use the RHEL `printadmin` group, writable driver share settings, `force group`, and file/directory masks.
- The SELinux section enabled `samba_enable_home_dirs`, which is unrelated to print serving, and relabeled `/var/spool/samba` as `samba_share_t` instead of preserving the default Samba spool label. Removed the unrelated boolean and changed the spool step to `restorecon`; kept `samba_share_t` labeling for `/var/lib/samba/drivers`.
- The service restart command restarted `nmb`, which is not required for the documented RHEL 9 Samba print-server setup and may fail if NetBIOS name service is not enabled. Changed it to restart `smb`.
- The driver upload instructions used the undefined `samba_admins` group and omitted the required `SePrintOperatorPrivilege`. Updated permissions to use `printadmin` and added the `net rpc rights grant` command from the RHEL workflow.
- The troubleshooting section pointed to `/var/log/cups/error_log`, but RHEL 9 CUPS logging is commonly accessed through systemd journal unless file logging is configured. Changed the command to `journalctl -u cups -f`.

## Review Notes
The post is technically valid after corrections. In future revisions, it could mention RHEL's documented `rpcd_spoolss` tuning for environments with many printers and the Windows Group Policy requirement for trusting non-package-aware Samba printer drivers.
