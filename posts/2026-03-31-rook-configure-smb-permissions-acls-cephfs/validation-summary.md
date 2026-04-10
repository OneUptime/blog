# Validation Summary: How to Configure SMB Permissions and ACLs with CephFS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CephFS (Ceph File System)
- Samba (SMB/CIFS server)
- Samba VFS modules: `vfs_ceph`, `acl_xattr`, `full_audit`
- POSIX ACLs (`setfacl` / `getfacl`)
- Windows ACLs (NT ACL semantics via PowerShell)
- rsyslog (audit log capture)

## Sources Consulted
- Samba `smb.conf` man page documentation (parameters: `vfs objects`, `map acl inherit`, `store dos attributes`, `kernel share modes`, `inherit acls`, `valid users`, `read list`, `write list`, `admin users`, `hosts allow`, `hosts deny`)
- Samba `vfs_full_audit` man page (operation names, syslog facility/priority, prefix macros)
- Samba `vfs_acl_xattr` man page (Windows ACL storage in extended attributes)
- Samba `vfs_ceph` documentation (`ceph:config_file`, `ceph:user_id` parameters)
- POSIX ACL utilities documentation (`setfacl -m`, `-d` flag for defaults, `g:` and `u:` qualifiers, `rwX` permission syntax)
- Microsoft PowerShell documentation for `Get-Acl`, `Set-Acl`, `System.Security.AccessControl.FileSystemAccessRule`, `SetAccessRuleProtection`

## Issues Found
No technical issues found.

## Review Notes
- The `vfs objects = ceph acl_xattr` ordering is correct — the CephFS filesystem module must come first in the VFS stack.
- The `kernel share modes = no` directive is correctly set; CephFS does not support kernel share modes and enabling it would cause errors.
- The PowerShell examples use correct .NET types and parameter ordering for `FileSystemAccessRule` (identity, rights, inheritance flags, propagation flags, access control type).
- The `setfacl` commands correctly use uppercase `X` (conditional execute — applies only to directories and files that already have execute), which is the appropriate choice for directory ACLs.
- The `SetAccessRuleProtection($true, $false)` call correctly disables inheritance and removes inherited rules (isProtected=true, preserveInheritance=false).
- The rsyslog configuration line uses a space separator between the facility.priority and file path, which is accepted by rsyslog (though traditionally tabs are used). This is functionally correct.
- The claim that "the most restrictive permission wins" for the interaction between share-level and file-level permissions is accurate for Samba.
