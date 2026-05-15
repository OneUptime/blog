# Validation Summary: How to Set Up SFTP-Only Users with Chroot on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- OpenSSH server
- SFTP
- ChrootDirectory
- Linux users and groups
- SELinux booleans

## Sources Consulted
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- Local `sshd_config(5)` manual page for the installed OpenSSH configuration directive behavior.
- Linux `useradd(8)` manual: https://man7.org/linux/man-pages/man8/useradd.8.html
- Linux `nologin(8)` manual: https://man7.org/linux/man-pages/man8/nologin.8.html
- Red Hat Enterprise Linux 7 OpenSSH documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-openssh
- Red Hat Enterprise Linux 9 SELinux documentation showing `ssh_chroot_rw_homedirs`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux

## Issues Found
- The chroot directory setup changed `/home/sftpuser1` to `root:root` but did not set a traversable mode afterward. On systems where newly created home directories default to a restrictive mode such as `700`, the SFTP user would be unable to access the chroot root or the `uploads` directory. Added `sudo chmod 755 /home/sftpuser1`, which keeps the directory non-writable by the SFTP user while allowing traversal.
- The test section said the user would only see the `uploads` directory. Because `useradd -m` can copy skeleton files into the home directory, this is not guaranteed. Reworded the statement to say the user is confined to `/home/sftpuser1` and can write to `uploads`.
- The post attributed failed regular SSH login only to `/sbin/nologin`. In this configuration, `ForceCommand internal-sftp` is also central because it forces the SFTP server for matched users. Updated the explanation to mention both `ForceCommand internal-sftp` and `/sbin/nologin`.

## Review Notes
The OpenSSH configuration directives and Linux account-management commands are valid. The SELinux boolean `ssh_chroot_rw_homedirs` is present in current Red Hat SELinux documentation, but SELinux behavior can vary by RHEL major version and local policy; administrators should verify with `getsebool -a | grep ssh_chroot_rw_homedirs` on the target host.
