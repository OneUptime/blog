# Validation Summary: How to Install and Configure a Samba File Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Samba
- SMB/CIFS file sharing
- SELinux
- firewalld
- Linux users, groups, and file permissions

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and using network file services - Samba standalone server, local user accounts, share setup, SELinux labeling, firewall, and service startup: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_network_file_services/configuring_and_using_network_file_services
- Samba smb.conf manual - share parameters including `map to guest`, `valid users`, `create mask`, and `directory mask`: https://www.samba.org/samba/docs/4.4/man-html/smb.conf.5.html
- Samba smbpasswd manual - `-a` and `-e` account management options: https://www.samba.org/samba/docs/current/man-html/smbpasswd.8.html
- firewalld firewall-cmd manual - `--permanent`, `--add-service`, and `--reload` usage: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat Enterprise Linux SELinux documentation - Samba booleans and `samba_share_t` behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-samba-booleans

## Issues Found
- The user creation steps did not enable the local operating system account. Red Hat documents that Samba requires both an operating system account for file system ACL validation and a Samba account for authentication, and that a disabled OS account can prevent access. Added `sudo passwd smbuser1` before `smbpasswd -a`.
- The shared directory was made group-writable before the `samba_users` group was assigned, but it did not set the setgid bit. This could cause new files to use a creator's primary group instead of the share group, limiting collaboration for other `samba_users` members. Moved the permission command after `chgrp` and changed it to `sudo chmod 2775 /srv/samba/shared`.
- The SELinux section enabled `samba_enable_home_dirs` and `samba_export_all_rw` for a labeled `/srv/samba/shared` share. These booleans are not required for this setup: `samba_enable_home_dirs` is for home directory shares, and `samba_export_all_rw` permits exporting paths that are not labeled with `samba_share_t`. Removed both commands to keep the configuration aligned with least privilege.
- The service startup step enabled `nmb` alongside `smb`. Red Hat's RHEL 9 standalone Samba server procedure starts `smb`; `nmb` is only needed for legacy NetBIOS name service scenarios. Updated the command and status check to use `smb` only, and marked `nmbd` as optional in the service diagram.

## Review Notes
The remaining commands and configuration snippets are technically valid for a basic authenticated Samba file share on RHEL 9. Future improvements could mention that `nmb` is optional for NetBIOS browsing/name service, but it is not required for direct SMB access by hostname or IP address.
