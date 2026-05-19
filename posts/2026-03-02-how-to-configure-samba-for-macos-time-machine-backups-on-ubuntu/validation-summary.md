# Validation Summary: How to Configure Samba for macOS Time Machine Backups on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Samba
- Samba VFS modules: fruit, catia, streams_xattr
- macOS Time Machine
- SMB
- UFW
- cron

## Sources Consulted
- Apple Support: Backup disks you can use with Time Machine: https://support.apple.com/en-us/102423
- Apple Developer Documentation Archive: Time Machine over SMB Specification: https://developer.apple.com/library/archive/releasenotes/NetworkingInternetWeb/Time_Machine_SMB_Spec/
- Samba vfs_fruit manual: https://www.samba.org/samba/docs/current/man-html/vfs_fruit.8.html
- Samba 4.8 vfs_fruit manual: https://www.samba.org/samba/docs/4.8/man-html/vfs_fruit.8.html
- Ubuntu vfs_fruit manual page: https://manpages.ubuntu.com/manpages/noble/man8/vfs_fruit.8.html
- Samba vfs_streams_xattr manual: https://www.samba.org/samba/docs/current/man-html/vfs_streams_xattr.8.html
- Samba 4.8.0 release notes: https://www.samba.org/samba/history/samba-4.8.0.html
- Samba smbpasswd manual: https://www.samba.org/samba/docs/current/man-html/smbpasswd.8.html
- Ubuntu useradd manual: https://manpages.ubuntu.com/manpages/jammy/man8/useradd.8.html
- Ubuntu Server documentation: Firewall: https://ubuntu.com/server/docs/how-to/security/firewalls/

## Issues Found
- The introduction said Samba supports "Apple Filing Protocol extensions" for Time Machine. Apple and Samba document Time Machine over SMB using Apple SMB/AAPL extensions, while AFP is deprecated for network Time Machine backups. Changed the wording to "Apple SMB extensions."
- The post described the configuration as covering "disk quotas" and said `fruit:time machine max size` sets a quota per share. Samba documents this option as a reported disk size limit based on Time Machine sparsebundle contents, not a filesystem-enforced quota. Updated the wording to "reported backup size limits" and clarified that it is not an enforced quota.
- The prerequisites and install command did not mention `samba-vfs-modules`, which is the Ubuntu package that provides `vfs_fruit` and related modules. Added it to the prerequisites and install command.
- The sample configuration included `fruit:posix_rename = yes`. That option existed in older Samba vfs_fruit documentation with a default of `yes`, but it is not present in current Samba vfs_fruit documentation. Removed the explicit setting to avoid an unsupported parameter on newer Samba versions.
- The troubleshooting section said to restart `nmbd` to re-announce the share via mDNS. Samba's Time Machine discovery uses Bonjour/mDNS through Avahi when Samba is built with Avahi support; `nmbd` is not the mDNS service. Updated the note to restart `smbd` and `avahi-daemon` when Avahi is used.
- The monitoring script used `cat > /usr/local/bin/check-tm-space.sh` and `chmod` without root privileges, which would fail for a normal sudo-capable user. Changed the example to use `sudo tee` and `sudo chmod`.

## Review Notes
The core Samba share configuration (`vfs objects = catia fruit streams_xattr`, `fruit:time machine = yes`, and `fruit:time machine max size`) matches the documented Samba Time Machine pattern. Future improvements could include guidance for restricting UFW to the local subnet and using filesystem-level quotas if hard per-user limits are required.
