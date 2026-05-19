# Validation Summary: How to Configure Samba Share Permissions on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu
- Samba
- smb.conf share configuration
- Linux filesystem permissions
- Samba VFS modules: recycle, full_audit, acl_xattr
- rsyslog
- smbclient and smbstatus

## Sources Consulted
- Samba smb.conf official man page: https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Samba vfs_recycle official man page: https://www.samba.org/samba/docs/current/man-html/vfs_recycle.8.html
- Samba vfs_full_audit official man page: https://www.samba.org/samba/docs/current/man-html/vfs_full_audit.8.html
- Samba vfs_acl_xattr official man page: https://www.samba.org/samba/docs/current/man-html/vfs_acl_xattr.8.html
- Samba smbclient official man page: https://www.samba.org/samba/docs/current/man-html/smbclient.1.html
- Samba smbstatus official man page: https://www.samba.org/samba/docs/4.15/man-html/smbstatus.1.html
- Ubuntu mount man page for ext4 mount options: https://manpages.ubuntu.com/manpages/noble/man8/mount.8.html
- Linux chmod man page for setgid and sticky bit behavior: https://www.man7.org/linux/man-pages/man1/chmod.1.html

## Issues Found
- The Samba share example described `0664` and `0775` while configuring `0660` and `0770`. Updated the comments so the stated permission bits match the actual `create mask` and `directory mask` values.
- The same share configured `inherit permissions = yes` without noting that it overrides `create mask`, `directory mask`, `force create mode`, and `force directory mode` behavior for new files and directories. Updated the comment to make that interaction explicit.
- The recycle bin example configured `recycle:repository = .recycle` but claimed deleted files would go under `.recycle/username/`. Updated the repository to `.recycle/%U` so the configuration matches the documented path.
- The full audit example used operation names that are not valid in current Samba `vfs_full_audit` documentation, such as `mkdir`, `rmdir`, `rename`, and `unlink`. Replaced them with current VFS operation names including `mkdirat`, `unlinkat`, and `renameat`.
- The Windows ACL section said `acl group control = yes` was required for Windows ACL support and described `nt acl support = yes` as disabling Samba's internal permission mapping. Updated the comments: `acl group control` delegates permission changes to the owning group, and `nt acl support = yes` keeps NT ACL support enabled.
- The filesystem guidance implied ext4 always needs `user_xattr,acl` added manually. Updated it to say modern Ubuntu ext4 filesystems normally have ACL and extended attribute support enabled, while older or custom mounts may need explicit options.
- The `[homes]` section said Samba creates each user's directory automatically. With the shown configuration, Samba expects the target directory to exist. Updated the text accordingly.
- The troubleshooting note for deletion suggested `store dos attributes` as the fix for ownership-based deletion behavior. Updated it to focus on directory write/execute permissions and sticky bit behavior.

## Review Notes
The post is technically relevant and valid after the corrections. The guidance is still intentionally general; production Samba deployments may need additional identity mapping, SELinux/AppArmor, firewall, and backup considerations depending on the Ubuntu release and domain integration model.
