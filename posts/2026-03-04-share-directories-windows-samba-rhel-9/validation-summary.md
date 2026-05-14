# Validation Summary: How to Share Directories with Windows Clients Using Samba on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Samba server configuration
- SMB/CIFS shares
- Linux filesystem permissions
- SELinux
- firewalld
- Windows Command Prompt
- PowerShell

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using Samba as a server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/assembly_using-samba-as-a-server_configuring-and-using-network-file-services
- Red Hat Enterprise Linux 9 documentation, "Using SELinux": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Samba `smb.conf(5)` manual: https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Samba Wiki, "Setting up a Share Using Windows ACLs": https://wiki.samba.org/index.php/Setting_up_a_Share_Using_Windows_ACLs
- Microsoft Learn, `net use`: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/gg651155(v=ws.11)
- Microsoft Learn, `New-PSDrive`: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/new-psdrive
- Microsoft Learn, `cmdkey`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cmdkey

## Issues Found
- The tag list used `Window` instead of `Windows`. Updated the tag to match the technology name.
- The permission-mapping section said Samba maps Windows permissions to Linux permissions using masks. Changed it to explain that `create mask` and `directory mask` limit Unix permissions for newly created files and directories, which matches the Samba `smb.conf` documentation.
- The `smb.conf` example used inline comments after parameter values. Moved those comments to separate lines to avoid ambiguity in Samba's line-based configuration format.
- The `force group` comment said all files are owned by the group. Updated it to describe Samba's documented behavior: operations on the share use the forced group for permission checks.
- The Windows ACL diagram and wrap-up referred to `vfs_acl_xattr`. Updated these references to the documented `acl_xattr` VFS module name used with `vfs objects = acl_xattr`.
- The SELinux section described `samba_export_all_rw` as a necessary boolean after applying the `samba_share_t` context. Removed that broad boolean because RHEL's normal documented flow is to label the share path with `samba_share_t`; `samba_export_all_rw` is for intentionally exporting paths regardless of their SELinux label.
- The performance snippet recommended broad low-level tuning, including `read raw`, `write raw`, and `aio read/write size = 16384`. Updated it to a more conservative optional tuning example and changed AIO values to `1`, because current Samba documentation says the reasonable values are `0` and `1`.

## Review Notes
The remaining Samba share definitions, Windows connection examples, SELinux file-context commands, firewall troubleshooting command, and cached credential commands are consistent with the consulted RHEL, Samba, and Microsoft documentation. The examples still require environment-specific setup outside the snippet, such as creating Samba users with passwords, opening the Samba firewalld service, and ensuring the guest account has appropriate filesystem permissions for writable guest shares.
