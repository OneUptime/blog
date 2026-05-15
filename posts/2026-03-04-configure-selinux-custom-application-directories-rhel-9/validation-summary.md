# Validation Summary: How to Configure SELinux for Custom Application Directories on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux
- `semanage fcontext`
- `restorecon`
- `matchpathcon`
- SELinux booleans and AVC troubleshooting
- Apache HTTP Server, MariaDB/MySQL, PostgreSQL, Samba, and NFS file labeling

## Sources Consulted
- Red Hat Enterprise Linux 9: Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- `semanage-fcontext(8)` manual page: https://man7.org/linux/man-pages/man8/semanage-fcontext.8.html
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, Samba configuration examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/epub/selinux_users_and_administrators_guide/how-file-context-is-determined
- `nfsd_selinux(8)` manual page: https://www.mankier.com/8/nfsd_selinux
- `sealert(8)` manual page: https://www.mankier.com/8/sealert
- `postgresql_selinux(8)` manual page: https://www.mankier.com/8/postgresql_selinux

## Issues Found
- The post said files created outside standard paths get `default_t`. RHEL documentation states that files commonly inherit the parent directory type, such as `var_t` under `/srv`, while newly-created objects in top-level directories can be labeled `default_t`. I changed the wording and diagram label to avoid the overgeneralization.
- The NFS export example used `nfs_t`. RHEL documentation describes `nfs_t` as the default label for client-side NFS mounts, while the `nfsd_selinux(8)` policy man page documents `public_content_t` for read-only shared content. I changed the example to use `public_content_t`.

## Review Notes
The core `semanage fcontext`, path equivalence, `restorecon`, listing, deleting, and modifying examples match documented syntax. Some examples are intentionally generic; production systems should still confirm the exact type with service-specific SELinux man pages from the `selinux-policy-doc` package.
