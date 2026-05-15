# Validation Summary: How to Configure NFSv4 with SELinux Contexts on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux
- NFS and NFSv4.2
- Linux audit tooling
- Apache, Samba, and libvirt SELinux booleans

## Sources Consulted
- Red Hat Enterprise Linux 9 Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 9 Managing file systems, mounting NFS shares: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-nfs-shares_managing-file-systems
- Linux nfs(5) manual page: https://man7.org/linux/man-pages/man5/nfs.5.html
- Linux exports(5) manual page: https://man7.org/linux/man-pages/man5/exports.5.html
- Linux ausearch(8) manual page: https://man7.org/linux/man-pages/man8/ausearch.8.html

## Issues Found
- The post stated that files served over NFS get the `nfs_t` type by default without mentioning the labeled NFS exception. I changed this to say default NFS mounts use `nfs_t` unless labeled NFS is in use.
- The labeled NFS example implied that mounting with `vers=4.2,sec=sys` was enough to mount with security labels. I changed the text to explain that NFSv4.2 allows clients to set and retrieve labels only when the server export enables it, added a minimal `/etc/exports` example with `security_label`, and clarified that clients need a consistent SELinux policy.

## Review Notes
The SELinux boolean examples, `setsebool -P` persistence behavior, `semanage fcontext` and `restorecon` usage, `setenforce` commands, and `ausearch`/`audit2allow` troubleshooting flow are technically valid for RHEL-style SELinux systems. The broad `nfs_export_all_rw` boolean is operationally permissive, so production guidance could be made more security-focused in a future revision, but it is not a command or syntax error.
