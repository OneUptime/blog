# Validation Summary: How to Export Home Directories Over NFS on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NFS server and client configuration
- `/etc/exports` and `/etc/fstab`
- firewalld
- SELinux booleans
- Linux user and group management
- XFS quotas

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and using network file services: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_network_file_services/index
- Red Hat Enterprise Linux 9: Mounting NFS shares: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-nfs-shares_managing-file-systems
- Red Hat Enterprise Linux 9: Managing file systems, XFS quota management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9: Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Linux `nfs(5)` manual page: https://man7.org/linux/man-pages/man5/nfs.5.html
- Local `useradd(8)` and `groupadd(8)` manual pages

## Issues Found
- The client `/etc/fstab` examples used the `intr` NFS mount option. The Linux NFS manual documents `intr` and `nointr` as ignored after kernel 2.6.25, so the examples were updated to remove `intr`.
- The manual UID/GID consistency example used `useradd -u 1500 -g 1500 jdoe` without first creating a group with GID 1500. The example was updated to create the group with `groupadd -g 1500 jdoe` and then create the user with `useradd -u 1500 -g 1500 -M -d /home/jdoe jdoe`.
- The XFS quota example comment implied that `xfs_quota limit` enables quotas. Red Hat documentation requires quotas to be enabled on the filesystem first, so the comment was changed to indicate that the command is run after enabling quotas.

## Review Notes
The remaining NFS server setup, `/etc/exports` syntax, `exportfs -arv`, firewalld service names, SELinux boolean usage, and `xfs_quota` limit/report commands are consistent with the consulted documentation. For a production deployment, NFSv4-only configuration, Kerberos-backed NFS security, and automounting homes with autofs would be useful future enhancements, but they are outside the scope of this post.
