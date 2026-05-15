# Validation Summary: How to Configure Samba User Authentication and Permissions on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Samba server configuration
- Samba local user authentication
- Linux users and groups
- POSIX file permissions
- Samba VFS full_audit logging

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and using network file services, "Using Samba as a server" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/assembly_using-samba-as-a-server_configuring-and-using-network-file-services
- Samba smb.conf(5) manual - https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Samba smbpasswd(8) manual - https://www.samba.org/samba/docs/current/man-html/smbpasswd.8.html
- Samba pdbedit(8) manual - https://www.samba.org/samba/docs/current/man-html/pdbedit.8.html
- Samba vfs_full_audit(8) manual - https://www.samba.org/samba/docs/current/man-html/vfs_full_audit.8.html

## Issues Found
- The `projects` share used `read list = @samba_readonly` but did not include `@samba_readonly` in `valid users`, so readonly users would be denied access before the read list mattered. Added `@samba_readonly` to `valid users`.
- The group-based access comment said "Read-only for writers" even though writers were in the `write list`. Updated the comment to match the actual access model.
- The `[homes]` section was described as automatically creating per-user shares and making them visible. Samba creates the service dynamically for an existing home directory when a user connects to that share name. Updated the wording accordingly.
- The password policy section claimed to configure password complexity and expiration, but the shown `pdbedit` commands configure minimum password length and password history only. Updated the wording to match the commands.
- The `full_audit:success` list used obsolete or invalid current Samba VFS operation names such as `mkdir`, `rmdir`, `rename`, and `unlink`. Updated the example to current documented operation names: `mkdirat`, `renameat`, and `unlinkat`.
- The audit section said the example logs all file operations, but it only logs selected operations. Updated the explanation to say selected operations.

## Review Notes
The remaining commands and configuration examples are consistent with the consulted Samba and Red Hat documentation for a local Samba file server on RHEL 9. In production RHEL environments with SELinux enforcing, administrators also need appropriate Samba SELinux labeling such as `samba_share_t`; that is outside the scope of this authentication and permissions-focused post.
